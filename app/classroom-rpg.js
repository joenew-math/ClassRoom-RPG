/* classroom-rpg.js
 * 從 班級RPG-公會大廳v126.html 拆出的傳統全域 runtime。
 * 請保留為一般 script，不要直接改成 type=module，避免破壞既有 inline handlers。
 */
if(typeof FB === "undefined"){ var FB = { ready:false, auth:null, user:null, db:null, functions:null }; }   /* SDK被擋時的保底 */
"use strict";
/* ============================================================
 * 班級 RPG v2 — 公會大廳(離線單檔)
 * 對應核心想法:
 *  1 長期經營:localStorage + JSON 匯出/匯入備份
 *  2 即時回饋:浮動 +XP 動畫、升級全屏特效、音效
 *  3 分組:名冊可建組/調組;大屏可整組加分
 *  4 點角色圖案加分:觸控大按鈕面板
 *  5 XP 升級 → 依職業自動成長屬性;金幣買裝備
 *  6 紙娃娃:SVG 分層(body/clothes/hat/weapon),
 *    佔位美術,之後換圖只改 DOLL_ART 內的片段
 *  7 觸控大屏:老師端預設為分組角色牆
 *  8 遊戲化:班級目標、寶箱事件(12%)、成就徽章
 * 公式對照正式系統:升級門檻 level*100、INT/AGI ±2%/點、
 * 換裝同槽替換、回收退 20%
 * ============================================================ */

const LS_KEY = "rpg-offline-test-v2";
const OLD_KEY = "rpg-offline-test-v1";
/* ════════════════════════════════════════════════════════════════
 * 🔄 轉職系統擴充指南(之後新增職業照這份清單做)
 * 新職業只需:在 JOB_INFO 加一筆定義(必填 name/emoji/color/role/diff/
 * tagline/ult/skill/tip/stats/growth),系統即自動接上:
 *   ✓ 職業選擇卡/自助註冊  ✓ 轉職卡選單  ✓ 升級成長  ✓ 名冊/家長頁
 * 以下為「選配」,不加也不會壞(有安全預設):
 *   - MAIN_STAT[職業]     主屬性(預設 atk)
 *   - ARENA_JOB_TUNE[職業] 戰場係數(預設 1)
 *   - SKILL_TREES[職業]    技能樹(無=不能點技,不炸)
 *   - ULT_DEFS[職業]       大招(無=預設 2 倍「全力一擊」)
 *   - JOB_SKILL[職業]      團體戰職業技(無=預設 1.5 倍強擊)
 *   - RO_TIER[職業]        RO 美術(無=通用佔位紙娃娃)
 *   - garenaAiStep 的 PREF_JOB/TIER 站位(無=預設近戰前排)
 * ════════════════════════════════════════════════════════════════ */

/* 🌏 世界城堡限定・全身傳說套裝
 * 套裝是純外觀收藏，不額外增加能力值；避免 500 鑽石商品變成付費戰力。
 * 紙娃娃以完整透明 PNG 顯示，保留一般六格裝備資料，卸下後立即恢復原造型。 */

/* 階段性鑽石外觀：不增加能力值，讓學生在 500 鑽石跨學年目標前仍有可達成收藏。 */

function legendSetInfo(id){return LEGEND_SETS.find(x=>x.id===id)||null;}
function diamondCosmeticInfo(id){return DIAMOND_COSMETICS.find(x=>x.id===id)||null;}
function peakNpcLegendId(job,index){
  if(job==="Warrior") return "abyss_dark_knight";
  if(job==="Rogue") return "shadow_hunter";
  if(job==="Cleric") return "skywing_templar";
  return index%2 ? "star_archmage" : "elemental_dragon_mage";
}
function legendSetSvgFx(set){
  const dots=Array.from({length:6},(_,i)=>{const a=i*Math.PI/3,x=50+Math.cos(a)*34,y=47+Math.sin(a)*25;return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(i%2?1.4:2.1)+'"/>';}).join("");
  return '<g class="legend-aura"><ellipse cx="50" cy="54" rx="34" ry="39"/></g>'
    +'<g class="legend-orbit">'+dots+'</g>'
    +'<g class="legend-rune"><path d="M50 7l4 7 8 1-6 6 2 8-8-4-8 4 2-8-6-6 8-1z"/></g>';
}
function legendSetJobText(set){return (set.jobs||[]).map(j=>(JOB_INFO[j]||{}).name||j).join("／");}
function legendSetCardHtml(set,s,mode){
  const owned=!!((s.legendSets||{})[set.id]),equipped=s.legendSetId===set.id,compatible=(set.jobs||[]).includes(s.job);
  let action="";
  if(mode==="shop"){
    action=owned?'<button class="btn" disabled>✓ 已收藏</button>'
      :'<button class="btn gold" data-legendbuy="'+set.id+'"'+(compatible&&(s.diamonds||0)>=set.price?'':' disabled')+'>'+(compatible?'💎 '+set.price+' 購買':'限 '+legendSetJobText(set))+'</button>';
  }else{
    action=equipped?'<button class="btn danger" data-legendoff="1">卸下套裝</button>'
      :'<button class="btn gold" data-legendwear="'+set.id+'"'+(compatible?'':' disabled')+'>'+(compatible?'穿戴套裝':'目前職業不符')+'</button>';
  }
  return '<div class="legend-set-card '+(owned?'owned ':'')+(equipped?'equipped':'')+'">'
    +(owned?'<span class="legend-set-owned">'+(equipped?'穿戴中':'已收藏')+'</span>':'')
    +'<div class="legend-set-art"><img src="'+set.img+'" alt="'+esc(set.name)+'"></div>'
    +'<div class="legend-set-name">'+set.icon+' '+esc(set.name)+'</div>'
    +'<div class="legend-set-meta">'+esc(set.desc)+'<br>職業：'+esc(legendSetJobText(set))+(mode==="shop"?'・500💎':'')+'</div>'+action+'</div>';
}

   // 🚫 v125:移除眼睛/眉毛/鼻子(素體已自帶五官,疊加會打架)   /* 造型槽:髮型+臉部 */

   // 工坊與掉落只保留六種裝備圖紙；素體、髮型圖紙已移除
   // 一般顯示的裝備部位(素體與五官另外處理)
   // 🎒 背包裝備上限(超過時自動出售最舊的)
    // 💎 學生工坊固定花費 1 顆鑽石；作品退回時全額退還
/* 圖紙品級:決定作品的能力值上限/允許特效/底價;掉落時先中部位再擲品級 */

/* ── 稀有／傳說詞條(Affix)────────────────────────
 * 詞條在圖紙掉落時鎖定，工坊不能自選；kind=atk 攻擊時、def 受擊時。 */

/* 傳說自製武器可由 Boss 圖紙低機率綁定一項跨職業武技；所有觸發率固定 8%，學生不能在工坊改選。 */

function equippedForgeWeaponSkill(s){
  const it=s&&s.weaponId?itemById(s.weaponId):null;
  return it&&it.type==="weapon"&&it.tier==="legend"&&it.weaponSkill?forgeWeaponSkillInfo(it.weaponSkill):null;
}
function triggerBossForgeWeaponSkill(s,b,dmg,fxMsgs,addHit){
  const ws=equippedForgeWeaponSkill(s);if(!ws||Math.random()>=.08)return false;
  const group=state.students.filter(x=>x.group===s.group&&x.currentHp>0),anchor='[data-charwall="'+s.id+'"]';
  if(ws.id==="renewal"){
    const low=group.sort((a,c)=>(a.currentHp/a.maxHp)-(c.currentHp/c.maxHp))[0];if(low){const h=Math.max(0,Math.min(Math.max(8,Math.round(low.maxHp*.14)),low.maxHp+skillMaxHpBonus(low)-low.currentHp));low.currentHp+=h;fxMsgs.push(ws.icon+ws.name+"+"+h);if(h)dmgPop(h,'[data-charwall="'+low.id+'"]',"heal");}
  }else if(ws.id==="shield_wall"){b.groupBuffs[s.group]=b.groupBuffs[s.group]||{};b.groupBuffs[s.group].def=Math.max(b.groupBuffs[s.group].def||0,.22);fxMsgs.push(ws.icon+ws.name+"(減傷22%)");}
  else if(ws.id==="cleanse"){group.forEach(x=>{const h=Math.min(6,x.maxHp+skillMaxHpBonus(x)-x.currentHp);x.currentHp+=h;if(h)dmgPop(h,'[data-charwall="'+x.id+'"]',"heal");});fxMsgs.push(ws.icon+ws.name+"(全組淨化)");}
  else if(ws.id==="agi"){b.groupBuffs[s.group]=b.groupBuffs[s.group]||{};b.groupBuffs[s.group].atk=Math.max(b.groupBuffs[s.group].atk||0,.14);fxMsgs.push(ws.icon+ws.name+"(攻擊+14%)");}
  else if(ws.id==="blast")addHit(dmg*.45,ws.icon+ws.name+"+");
  else if(ws.id==="chain"){addHit(dmg*.32,ws.icon+ws.name+"+");addHit(dmg*.22,"⚡+");}
  else if(ws.id==="frost"){b.counterHalf=true;fxMsgs.push(ws.icon+ws.name+"(反擊減半)");}
  else if(ws.id==="hunter_mark"){b.weakness=true;b.exposeBonus=Math.max(b.exposeBonus||0,.35);fxMsgs.push(ws.icon+ws.name+"(下一擊+35%)");}
  skillFxPlay(ws.fx,anchor);comicPop(ws.icon+ws.name+" 8%！","boom","#ffd563",anchor);return true;
}
/* 取得學生已裝備的所有詞條(來自穿戴中的自訂裝備)*/
function equippedAffixes(s){
  const out = [];
  for(const slot of EQUIP_SLOTS){
    const it = itemById(s[slot+"Id"]);
    if(it && it.affix) out.push(it.affix);
  }
  return out;
}
function triggeredAffixes(s,kind){
  const seen=new Set(),out=[];
  for(const key of equippedAffixes(s)){
    if(seen.has(key))continue;seen.add(key);
    const af=affixInfo(key);if(af&&af.kind===kind&&Math.random()*100<af.chance)out.push(af);
  }
  return out;
}
function rollTier(){
  const total = BP_TIERS.reduce((a,t)=>a+t.w, 0);
  let r = Math.random()*total;
  for(const t of BP_TIERS){ r -= t.w; if(r<=0) return t.key; }
  return "common";
}
function bpKey(type,tier,affix,weaponSkill,statCode){return type+":"+tier+(affix||weaponSkill||statCode?":"+(affix||""):"")+(weaponSkill||statCode?":"+(weaponSkill||""):"")+(statCode?":"+statCode:"");}
function bpLabel(key){
  const q = key.split(":");
  const ti = tierInfo(q[1]||"common");
  const af = q[2] ? affixInfo(q[2]) : null;
  const ws=q[3]?forgeWeaponSkillInfo(q[3]):null;
  const stat=blueprintStatText(q[4]);
  return ti.icon+ti.name+"・"+TYPE_NAME[q[0]]+(af?" ["+af.icon+af.name+"]":"")+(ws?" ["+ws.icon+ws.name+" 8%]":"")+(stat?" ["+stat+"]":"");
}

/* ══ 裝備價值公式 ══
   底價 = 25 + 物品等級×3 + ATK×22 + DEF×18 + AGI×20 + INT×20 + 特效/詞條價值，最後進位至 10 金。
   圖紙仍保有各品級最低價；掉落限定(price=0)維持不可購買。 */

/* 同品級內仍依物品等級逐步開放能力點，避免低等裝備直接填滿整個品級上限。 */

SHOP_ITEMS.forEach(it=>{
  if(!ALL_SLOTS.includes(it.type)) return;
  it.itemLevel=itemLevelOf(it);
  if(it.price>0) it.price=equipmentPriceFloor(it);           /* 內建商品統一依公式定價；掉落限定維持 0 */
});
function itemById(id){
  return SHOP_ITEMS.find(i=>i.id===id)
    || (typeof state!=="undefined" && state && state.customItems ? state.customItems.find(i=>i.id===id) : null)
    || null;
}
/* ⚔️ 裝備詳情卡:把系統既有的深度(屬性/詞條/光暈)完整呈現 */

/* 綜合戰力:攻擊權重最高(直接影響輸出),其餘等權;有詞條再加成 */

function itemDetailHtml(it, s){
  if(!it) return "";
  const color = RARITY_COLOR[it.rarity] || "#9aa0aa";
  const rzh = RARITY_ZH[it.rarity] || it.rarity;
  const typeZh = TYPE_NAME[it.type] || it.type;
  const icon = it.pixels ? customThumb(it, 44) : (TYPE_ICON[it.type] || "❓");
  // 主要屬性
  const statLines = [
    ["⚔️ 攻擊力", it.atk], ["🛡 防禦力", it.def],
    ["💨 敏捷", it.agi], ["🔮 智力", it.int]
  ].filter(x=>x[1]).map(x=>
    '<div class="idet-line"><span>'+x[0]+'</span><b>+'+x[1]+'</b></div>').join("");
  // 詞條(傳說專屬)
  const af = it.affix ? affixInfo(it.affix) : null;
  const affixHtml = af
    ? '<div class="idet-sec"><div class="idet-sect">詞條效果</div>'
      + '<div class="idet-green"><b>'+af.icon+' '+af.name+'・'+af.short+'</b><br>'+esc(af.desc)+'</div></div>'
    : "";
  const ws=it.weaponSkill?forgeWeaponSkillInfo(it.weaponSkill):null;
  const weaponSkillHtml=ws?'<div class="idet-sec"><div class="idet-sect">鍛造武技・固定 8%</div><div class="idet-green"><b>'+ws.icon+' '+esc(ws.name)+'（'+esc(ws.source)+'）</b><br>'+esc(ws.desc)+'</div></div>':'';
  // 光暈特效
  const fxHtml = (it.fx && it.fx!=="none")
    ? '<div class="idet-sec"><div class="idet-sect">光暈特效</div>'
      + '<div class="idet-green">'+esc(FX_NAME[it.fx]||it.fx)+'</div></div>'
    : "";
  // 目前是否穿戴中 / 與身上那件比較
  let cmpHtml = "";
  if(s && it.type && it.type!=="consumable"){
    const cur = itemById(s[it.type+"Id"]);
    if(cur && cur.id!==it.id){
      const d = itemPower(it) - itemPower(cur);
      cmpHtml = '<div class="idet-sec"><div class="idet-sect">與身上比較</div>'
        + '<div class="idet-line"><span>'+esc(cur.name)+'</span>'
        + '<b style="color:'+(d>0?"#6fdc8c":(d<0?"#e07070":"#8a93a8"))+'">'
        + (d>0?"+":"")+d+' 戰力</b></div></div>';
    }
  }
  return '<div class="idet">'
    + '<div class="idet-head" style="border-bottom-color:'+color+'44">'
    + '<div class="idet-name" style="color:'+color+'">'+esc(it.name)+'</div>'
    + '<div class="idet-sub" style="color:'+color+'">'+rzh+'・'+typeZh+(it.jobs?'・'+it.jobs.map(j=>(JOB_INFO[j]||{}).name||j)+'限定':'')+'</div></div>'
    + '<div class="idet-hero">'
    + '<div class="idet-icon">'+icon+'</div>'
    + '<div><div class="idet-plabel">綜合戰力</div>'
    + '<div class="idet-power">'+itemPower(it)+'</div></div></div>'
    + (statLines ? '<div class="idet-sec"><div class="idet-sect">主要屬性</div>'+statLines+'</div>' : "")
    + affixHtml + weaponSkillHtml + fxHtml + cmpHtml
    + (it.effect ? '<div class="idet-sec"><div class="idet-sect">'+(it.weaponPattern?'傳說武器戰技':'道具效果')+'</div><div class="idet-green">'+esc(it.effect)+'</div></div>' : "")
    + '<div class="idet-foot">'
    + '<span>'+(ALL_SLOTS.includes(it.type)?"Lv."+itemLevelOf(it)+"・":"")+(it.price===0?"🏆 掉落限定":"💰 "+it.price+" 金")+'</span>'
    + '<span>'+(it.creatorId ? "🎨 "+esc((stu(it.creatorId)||{name:"?"}).name) : "")+'</span>'
    + '</div></div>';
}
function showItemDetail(id, sid){
  const it = itemById(isNaN(+id) ? id : +id);
  if(!it) return;
  const s = sid ? stu(sid) : null;
  modalHost.innerHTML = '<div class="overlay" id="ovl"><div class="modal" style="max-width:380px;background:none;border:none;box-shadow:none;padding:0">'
    + itemDetailHtml(it, s)
    + '<div style="text-align:center;margin-top:10px"><button class="btn" id="idetClose">關閉</button></div>'
    + '</div></div>';
  document.getElementById("ovl").onclick = (e)=>{ if(e.target.id==="ovl") modalHost.innerHTML=""; };
  document.getElementById("idetClose").onclick = ()=>{ modalHost.innerHTML=""; };
}
function allShopItems(){
  return SHOP_ITEMS.concat(state.customItems.filter(c=>c.status==="approved"&&EQUIP_SLOTS.includes(c.type)));
}

/* ── 教師頒發稱號目錄(效果隱藏,配戴才生效;目錄僅教師「稱號設計」可見) ── */

function titleDefOf(name){
  return TITLE_DEFS.find(t=>t.name===name) || (state.customTitleDefs||[]).find(t=>t.name===name) || null;
}
/* 配戴中稱號的效果(沒配戴或無效果=全零) */
function titleEffect(s){
  const d = s && s.title ? titleDefOf(s.title) : null;
  const e = d && d.effect ? d.effect : {};
  return { atk:e.atk||0, def:e.def||0, agi:e.agi||0, int:e.int||0, hp:e.hp||0,
           xpMul:e.xpMul||0, goldMul:e.goldMul||0, shopOff:e.shopOff||0 };
}
/* 擁有的稱號 = 內建成就稱號 + 教師任務頒發稱號 */
function ownedTitles(s){
  const fromAch = (s.achievements||[]).map(id=>{ const a=ACHIEVEMENTS.find(x=>x.id===id); return a?a.title:null; }).filter(Boolean);
  return [...new Set([...fromAch, ...(s.customTitles||[])])];
}
function grantTitle(s, title){
  if(!title) return;
  if(!s.customTitles) s.customTitles = [];
  if(ownedTitles(s).includes(title)) return;
  s.customTitles.push(title);
  addLog(s.id, "獲得稱號【"+title+"】");
  toast("🎖 "+s.name+" 獲得稱號【"+title+"】"); sfx("achieve");
}

/* ── 紙娃娃(SVG 分層,佔位美術)────────────────────────
 * 之後換正式美術:只需要改 DOLL_ART 裡各 id 對應的 SVG 片段,
 * 圖層順序固定為 body → clothes → hat → weapon,座標系 0..100 */

   // 創作解析度基準 32(v89 升級);每件作品自帶 gw/gh 欄位,舊作(16×16)照原尺寸渲染不受影響
// 🎯 畫布格數依「裝備在人物身上的落點比例」(RO_REGION)決定,讓畫布長寬比=虛線框比例,所見即所得
function gridW(type){
  if(type==="weapon") return 16;                    // 武器維持 16×32 直條(相容舊作)
  const rg = (typeof RO_REGION!=="undefined") && RO_REGION[type];
  if(!rg) return GRID;
  // 以較長邊為 GRID 格,另一邊依比例縮放(至少 8 格,保留繪畫細節)
  const ratio = rg.w/rg.h;
  return ratio>=1 ? GRID : Math.max(8, Math.round(GRID*ratio));
}
function gridH(type){
  if(type==="weapon") return GRID;
  const rg = (typeof RO_REGION!=="undefined") && RO_REGION[type];
  if(!rg) return GRID;
  const ratio = rg.w/rg.h;
  return ratio>=1 ? Math.max(8, Math.round(GRID/ratio)) : GRID;
}
/* 中心等比縮放(最近鄰取樣):f>1 放大、f<1 縮小 */
function scalePixels(pixels, f, gw, gh){
  const out = {}; const cx = (gw-1)/2, cy = (gh-1)/2;
  for(let y=0;y<gh;y++) for(let x=0;x<gw;x++){
    const sx = Math.round((x-cx)/f + cx), sy = Math.round((y-cy)/f + cy);
    const c = pixels[sx+","+sy];
    if(c) out[x+","+y] = c;
  }
  return out;
}
function clipPixels(pixels, gw, gh){
  const out = {}; let dropped = 0;
  for(const k in pixels){
    const q = k.split(","); 
    if(+q[0]>=0 && +q[0]<gw && +q[1]>=0 && +q[1]<gh) out[k] = pixels[k];
    else dropped++;
  }
  return {pixels:out, dropped};
}
/* 學生像素創作在紙娃娃上的落點區域(依作品 grid 格數映射,目前新作品為 16×16) */

function customPixelsSVG(pixels, R, gw, gh){
  if(!R || !pixels) return "";
  const cw = R.w/gw, ch = R.h/gh;
  const bleed = Math.min(cw, ch) * 0.08;
  let out = '<g shape-rendering="crispEdges">';
  for(const k in pixels){
    const c = pixels[k]; if(!c) continue;
    const p = k.split(",");
    out += '<rect x="'+(R.x+(+p[0])*cw-bleed)+'" y="'+(R.y+(+p[1])*ch-bleed)
      +'" width="'+(cw+bleed*2)+'" height="'+(ch+bleed*2)+'" fill="'+c+'"/>';
  }
  return out + '</g>';
}
function customThumb(i, size){
  if(i.img){
    const o = fxOverlaySVG(i.fx, {x:0,y:0,w:100,h:100}, i.pixels);
    const tr = imgTransform(i.imgT, 50, 50);
    return '<svg viewBox="0 0 100 100" width="'+size+'" height="'+size+'" aria-hidden="true">'
      + toonDefs()
      + o.pre + TOON_OPEN + '<g'+tr+'><image href="'+i.img+'" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/></g>' + TOON_CLOSE + o.post + '</svg>';
  }
  const gw = i.gw || i.grid || 12, gh = i.gh || i.grid || 12;
  const R = {x:0, y:0, w:gw, h:gh};
  const o = fxOverlaySVG(i.fx, R, i.pixels);
  const body = (i.smooth ? customPixelsSmoothSVG : customPixelsSVG)(i.pixels, R, gw, gh);
  return '<svg viewBox="-0.5 -0.5 '+(gw+1)+' '+(gh+1)+'" width="'+Math.round(size*gw/gh<size?size*gw/gh:size)+'" height="'+size+'" aria-hidden="true">'
    + toonDefs()
    + o.pre + TOON_OPEN + body + TOON_CLOSE + o.post + '</svg>';
}
function slotArt(s, slot, override){
  if(override && override.type===slot) return customArt(override, slot);
  const id = s[slot+"Id"];
  if(!id) return "";
  if(id>=1000){ const it = itemById(id); return it ? customArt(it, slot) : ""; }
  const petItem=itemById(id),petVisual=petCraftVisualItem(petItem);
  if(petVisual) return customArt(petVisual,slot);
  return (DOLL_ART[slot] && DOLL_ART[slot][id]) || "";
}
/* ══ RO 風紙娃娃(美編強化示範,目前僅套用 roStyle 角色 = 測試戰士)══
 * Q 版比例:大頭(約佔身高一半)、短身、大眼、描邊+漸層+高光。
 * 之後全面推廣:給角色 roStyle=true 即套用;每件裝備在 RO_ART 補一段 SVG。 */

/* ══ 轉職服裝系統(RO 風,示範:戰士線)══
 * 職業服是紙娃娃的「底層」,商店裝備照樣穿在外層。
 * 轉職門檻:Lv1 初心者 → Lv5 一轉 → Lv15 二轉 → Lv30 三轉。
 * 之後推廣:在 RO_TIER 為 Mage/Rogue/Cleric 各補一條轉職線即可。 */

/* 商店／背包用的裝備美術縮圖：直接沿用紙娃娃圖層，不再只顯示 emoji。 */

/* 寵物卡製作裝備同時供背包縮圖與紙娃娃使用，避免「有能力值、角色身上卻看不見」。 */
function petCraftVisualItem(it){
  if(!it||!it.petCraft)return null;
  const v=PET_CRAFT_VISUALS[it.id]||{kind:"crest",color:"#d6a94b",fx:"sparkle"},gw=gridW(it.type),gh=gridH(it.type);
  return Object.assign({},it,{gw,gh,pixels:starterPixels(it.type,gw,gh,v.kind,v.color),smooth:false,fx:v.fx});
}
function itemArtThumb(it, size){
  if(!it) return "❓";
  if(it.pixels || it.img) return customThumb(it, size);
  if(it.petCraft) return customThumb(petCraftVisualItem(it), size);
  const art = (RO_ART[it.type] && RO_ART[it.type][it.id]) || (DOLL_ART[it.type] && DOLL_ART[it.type][it.id]);
  if(!art) return TYPE_ICON[it.type] || "❓";
  return '<svg viewBox="0 0 100 100" width="'+size+'" height="'+size+'" aria-hidden="true">'
    + RO_DEFS + toonDefs() + TOON_OPEN + art + TOON_CLOSE + '</svg>';
}
function tierOf(s){
  if(s.roTier !== undefined && s.roTier !== null) return s.roTier;   // 預覽用強制階級
  const lv = s.level || 1;
  for(let i = RO_TIER_LV.length-1; i >= 0; i--){ if(lv >= RO_TIER_LV[i]) return i; }
  return 0;
}
function roOutfit(s){
  const line = RO_TIER[s.job];
  if(!line) return RO_DEFAULT_OUTFIT;
  return line[Math.min(tierOf(s), line.length-1)] || RO_DEFAULT_OUTFIT;
}
function tierPreviewSVG(job, tier, size){
  const fake = { job, roStyle:true, roTier:tier, level:1,
    hatId:null, clothesId:null, weaponId:null, backId:null, shoesId:null,
    eyesId:null, browsId:null, noseId:null, blueprints:{} };
  return dollRO(fake, size);
}

/* 匯入美術圖層:全畫布(0,0,100,100)疊圖,規格見美術規格書 */
function artImg(key){
  const A = (typeof state!=="undefined" && state && state.art) || {};
  if(!A[key]) return null;
  if(key.indexOf("base:")===0){
    // 🧍 素體底層:大頭Q版,對齊裝備座標(頭在上、軀幹對齊衣服y50~82區、腳對齊y88)
    return '<image href="'+A[key]+'" x="20" y="6" width="60" height="86" preserveAspectRatio="xMidYMax meet"/>';
  }
  return '<image href="'+A[key]+'" x="0" y="0" width="100" height="100"/>';
}
/* ── 創作特效(SVG 原生動畫,離線可用)────────────── */
function avgPixelColor(pixels){
  let r=0,g=0,b=0,n=0;
  for(const k in (pixels||{})){
    const c = pixels[k];
    if(/^#[0-9a-fA-F]{6}$/.test(c)){
      r+=parseInt(c.slice(1,3),16); g+=parseInt(c.slice(3,5),16); b+=parseInt(c.slice(5,7),16); n++;
    }
  }
  if(!n) return "#ffe08a";
  const h=v=>("0"+Math.round(v/n).toString(16)).slice(-2);
  return "#"+h(r)+h(g)+h(b);
}
let _fxId = 0;

/* 取得學生穿戴裝備上的光暈屬性(用於戰鬥觸發增益)*/
function equippedGlows(s){
  const out = [];
  for(const slot of ["hatId","clothesId","pantsId","shoesId","backId","weaponId","eyesId","browsId","noseId"]){
    const id = s[slot]; if(!id || id<1000) continue;
    const it = itemById(id);
    if(it && it.fx && ELEM_FX[it.fx]) out.push(it.fx);
  }
  return out;
}
/* 柔邊外圍光暈:用作品像素本身做模糊放大當光源,沿外輪廓發光(不生硬) */
function auraSVG(R, pixels, color, opacity, dur, gw, gh){
  const fid = "aura"+(_fxId++);
  const cx=R.x+R.w/2, cy=R.y+R.h/2;
  // 以像素群為光源:複製像素、上色、放大、高斯模糊 → 柔和外圍光暈
  const cw=R.w/(gw||16), ch=R.h/(gh||16);
  let shape = "";
  let cnt = 0;
  for(const k in pixels){
    if(k[0]==='_') continue;
    const q=k.split(","); const x=+q[0], y=+q[1];
    shape += '<rect x="'+(R.x+x*cw)+'" y="'+(R.y+y*ch)+'" width="'+cw+'" height="'+ch+'" fill="'+color+'"/>';
    cnt++;
  }
  if(!cnt){   // 空圖:退回柔和橢圓光暈
    shape = '<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+(R.w*0.5)+'" ry="'+(R.h*0.5)+'" fill="'+color+'"/>';
  }
  const blur = Math.max(2.2, R.w*0.10);
  const D = dur || 2;
  const lo = (opacity*0.25).toFixed(3), hi = Math.min(1, opacity*1.25).toFixed(3), mid = opacity.toFixed(3);
  // 呼吸燈:透明度大幅脈動(暗→超亮)+ 範圍隨呼吸縮放,讓光暈明顯地「亮起來」
  return '<defs><filter id="'+fid+'" x="-80%" y="-80%" width="260%" height="260%">'
    + '<feGaussianBlur stdDeviation="'+blur+'"/></filter></defs>'
    + '<g filter="url(#'+fid+')">'
    + '<g transform="translate('+cx+' '+cy+')">'
    + '<g opacity="'+mid+'">'
    + '<animate attributeName="opacity" values="'+lo+';'+hi+';'+lo+'" dur="'+D+'s" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" repeatCount="indefinite"/>'
    + '<animateTransform attributeName="transform" type="scale" values="0.9;1.12;0.9" dur="'+D+'s" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" additive="sum" repeatCount="indefinite"/>'
    + '<g transform="translate('+(-cx)+' '+(-cy)+')">'+shape+'</g>'
    + '</g></g></g>';
}
/* 閃亮高光:光暈上快速閃爍的十字星芒,增加「發亮」存在感 */
function shineSVG(R, color, count, dur){
  const spots = [[0.3,0.28],[0.7,0.4],[0.5,0.7],[0.25,0.62],[0.75,0.7]].slice(0, count||3);
  let out = "";
  spots.forEach((sp,i)=>{
    const cx=R.x+R.w*sp[0], cy=R.y+R.h*sp[1], s=Math.max(2.6, R.w*0.14);
    out += '<g opacity="0" transform="translate('+cx+' '+cy+')">'
      + '<path d="M 0 '+(-s)+' L '+(s*0.16)+' '+(-s*0.16)+' L '+s+' 0 L '+(s*0.16)+' '+(s*0.16)+' L 0 '+s+' L '+(-s*0.16)+' '+(s*0.16)+' L '+(-s)+' 0 L '+(-s*0.16)+' '+(-s*0.16)+' Z" fill="'+(color||"#ffffff")+'"/>'
      + '<circle cx="0" cy="0" r="'+(s*0.28)+'" fill="#ffffff"/>'
      + '<animate attributeName="opacity" values="0;0.65;0" dur="'+(dur||1.3)+'s" begin="'+(i*0.4)+'s" repeatCount="indefinite"/>'
      + '<animateTransform attributeName="transform" type="scale" values="0.4;1.0;0.4" dur="'+(dur||1.3)+'s" begin="'+(i*0.4)+'s" additive="sum" repeatCount="indefinite"/>'
      + '</g>';
  });
  return out;
}
/* 武器專屬元素特效：讓細長武器有「附魔在刃上」而不是只有整團光暈的感覺。 */
function weaponElementFXSVG(fx, R, E){
  if(R.h < R.w*1.35) return "";
  const cx=R.x+R.w/2, top=R.y+R.h*.12, bot=R.y+R.h*.9, sw=Math.max(1.1,R.w*.055), out=[];
  if(fx==="flameFx"){
    [[-.22,.28],[.18,.5],[-.12,.72]].forEach((q,i)=>{ const x=cx+R.w*q[0], y=R.y+R.h*q[1], h=R.h*.18;
      out.push('<path d="M '+x+' '+(y+h*.35)+' Q '+(x-R.w*.18)+' '+(y-h*.12)+' '+x+' '+(y-h)+' Q '+(x+R.w*.2)+' '+(y-h*.1)+' '+x+' '+(y+h*.35)+' Z" fill="'+E.c1+'" stroke="'+E.core+'" stroke-width="'+sw+'" opacity=".9"><animate attributeName="opacity" values=".35;1;.35" dur="'+(1.05+i*.18)+'s" repeatCount="indefinite"/></path>'); });
  }else if(fx==="windFx"){
    [0,.23,.46].forEach((o,i)=>{ const y=top+R.h*o;
      out.push('<path d="M '+(cx-R.w*.52)+' '+(y+R.h*.18)+' Q '+(cx+R.w*.7)+' '+y+' '+(cx-R.w*.32)+' '+(y-R.h*.2)+'" fill="none" stroke="'+(i===1?E.c2:E.c1)+'" stroke-width="'+sw*(2-i*.25)+'" stroke-linecap="round" stroke-dasharray="4 3" opacity=".8"><animate attributeName="stroke-dashoffset" values="18;0" dur="1.1s" repeatCount="indefinite"/></path>'); });
  }else if(fx==="frostFx"){
    [.25,.47,.69].forEach((o,i)=>{ const x=cx+(i%2?R.w*.22:-R.w*.2), y=top+R.h*o, z=Math.max(2,R.w*.12);
      out.push('<path d="M '+x+' '+(y-z)+' L '+(x+z*.72)+' '+y+' L '+x+' '+(y+z)+' L '+(x-z*.72)+' '+y+' Z" fill="'+E.c2+'" stroke="'+E.core+'" stroke-width="'+sw+'" opacity=".88"><animateTransform attributeName="transform" type="rotate" from="0 '+x+' '+y+'" to="180 '+x+' '+y+'" dur="'+(2.1+i*.35)+'s" repeatCount="indefinite"/></path>'); });
  }else if(fx==="earthFx"){
    const gy=bot-R.h*.08;
    out.push('<circle cx="'+cx+'" cy="'+gy+'" r="'+(R.w*.34)+'" fill="none" stroke="'+E.c2+'" stroke-width="'+sw+'" stroke-dasharray="2 2" opacity=".85"><animateTransform attributeName="transform" type="rotate" from="0 '+cx+' '+gy+'" to="360 '+cx+' '+gy+'" dur="4s" repeatCount="indefinite"/></circle>');
    [-.25,0,.25].forEach((q,i)=>{ const x=cx+R.w*q, y=gy-R.h*(.08+i*.09), z=Math.max(1.8,R.w*.1);
      out.push('<path d="M '+x+' '+(y-z)+' L '+(x+z)+' '+y+' L '+(x+z*.45)+' '+(y+z)+' L '+(x-z*.7)+' '+(y+z*.55)+' L '+(x-z)+' '+y+' Z" fill="'+E.core+'" stroke="'+E.c2+'" stroke-width=".55"><animate attributeName="opacity" values=".45;1;.45" dur="'+(1.4+i*.25)+'s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 2;0 -2;0 2" dur="'+(1.4+i*.25)+'s" repeatCount="indefinite"/></path>'); });
  }
  return out.join("");
}
function fxOverlaySVG(fx, R, pixels, gw, gh){
  if(!fx || fx==="none" || !R) return {pre:"", post:""};
  gw = gw || 16; gh = gh || 16;
  // ── 四屬性光暈 ──
  if(ELEM_FX[fx]){
    const E = ELEM_FX[fx];
    const cx=R.x+R.w/2, cy=R.y+R.h/2;
    const pre = auraSVG(R, pixels, E.c1, 0.68, 1.8, gw, gh) + auraSVG(R, pixels, E.c2, 0.4, 1.2, gw, gh);
    let post = shineSVG(R, E.c2, 3, 1.4);
    if(fx==="flameFx"){        // 火:上升火花
      [[0.3,0.8],[0.6,0.9],[0.45,0.7]].forEach((sp,i)=>{
        const px=R.x+R.w*sp[0], py=R.y+R.h*sp[1], sz=Math.max(1.6,R.w*0.06);
        post += '<circle cx="'+px+'" cy="'+py+'" r="'+sz+'" fill="'+E.c2+'" opacity="0">'
          + '<animate attributeName="cy" values="'+py+';'+(py-R.h*0.5)+'" dur="'+(1.2+i*0.3)+'s" repeatCount="indefinite"/>'
          + '<animate attributeName="opacity" values="0.55;0" dur="'+(1.2+i*0.3)+'s" repeatCount="indefinite"/></circle>';
      });
    }else if(fx==="windFx"){   // 風:多層螺旋流線 + 飄動葉片(優雅飄逸)
      // 三條粗細/速度/半徑不同的環繞流線,交錯旋轉營造氣流感
      const swirls = [
        { rx:R.w*0.52, ry:R.h*0.40, w:2.0, dur:3.2, col:E.c1, op:0.75, dir:1  },
        { rx:R.w*0.40, ry:R.h*0.52, w:1.4, dur:4.5, col:E.c2, op:0.6,  dir:-1 },
        { rx:R.w*0.60, ry:R.h*0.30, w:1.1, dur:2.6, col:E.c1, op:0.5,  dir:1  },
      ];
      swirls.forEach((sw,i)=>{
        // 用兩段開口弧(非閉合橢圓)呈現「氣流帶」,末端漸細
        const d = 'M '+(cx-sw.rx)+' '+cy
          + ' C '+(cx-sw.rx*0.5)+' '+(cy-sw.ry)+' '+(cx+sw.rx*0.5)+' '+(cy-sw.ry)+' '+(cx+sw.rx)+' '+cy
          + ' C '+(cx+sw.rx*0.5)+' '+(cy+sw.ry*0.6)+' '+(cx-sw.rx*0.2)+' '+(cy+sw.ry*0.6)+' '+(cx-sw.rx*0.55)+' '+cy;
        const to = (sw.dir>0?360:-360);
        post += '<path d="'+d+'" stroke="'+sw.col+'" stroke-width="'+sw.w+'" fill="none" stroke-linecap="round" opacity="'+sw.op+'">'
          + '<animateTransform attributeName="transform" type="rotate" from="0 '+cx+' '+cy+'" to="'+to+' '+cx+' '+cy+'" dur="'+sw.dur+'s" repeatCount="indefinite"/>'
          + '<animate attributeName="opacity" values="'+(sw.op*0.4)+';'+sw.op+';'+(sw.op*0.4)+'" dur="'+(sw.dur*0.6)+'s" repeatCount="indefinite"/></path>';
      });
      // 飄動的小葉片/花瓣,沿螺旋路徑繞行並自轉
      [[0,3.6],[0.33,4.2],[0.66,3.0]].forEach((lf,i)=>{
        const leafR = R.w*0.5;
        const lx = cx + leafR, ly = cy;
        post += '<g opacity="0.5">'
          + '<g transform="translate('+lx+' '+ly+')">'
          + '<path d="M 0 0 Q '+(R.w*0.06)+' '+(-R.w*0.05)+' 0 '+(-R.w*0.11)+' Q '+(-R.w*0.06)+' '+(-R.w*0.05)+' 0 0 Z" fill="'+E.c2+'" stroke="'+E.core+'" stroke-width="0.4">'
          + '<animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="'+(1.4+i*0.3)+'s" repeatCount="indefinite"/></path>'
          + '</g>'
          + '<animateTransform attributeName="transform" type="rotate" from="'+(lf[0]*360)+' '+cx+' '+cy+'" to="'+(lf[0]*360+360)+' '+cx+' '+cy+'" dur="'+lf[1]+'s" repeatCount="indefinite"/>'
          + '</g>';
      });
    }else if(fx==="frostFx"){  // 冰:結晶閃爍
      [[0.28,0.32],[0.72,0.5],[0.5,0.75]].forEach((sp,i)=>{
        const px=R.x+R.w*sp[0], py=R.y+R.h*sp[1], sz=Math.max(2,R.w*0.09);
        post += '<g opacity="0" transform="translate('+px+' '+py+')"><path d="M 0 '+(-sz)+' L 0 '+sz+' M '+(-sz)+' 0 L '+sz+' 0 M '+(-sz*0.7)+' '+(-sz*0.7)+' L '+(sz*0.7)+' '+(sz*0.7)+' M '+(sz*0.7)+' '+(-sz*0.7)+' L '+(-sz*0.7)+' '+(sz*0.7)+'" stroke="'+E.c2+'" stroke-width="1.2"/>'
          + '<animate attributeName="opacity" values="0;1;0" dur="2s" begin="'+(i*0.6)+'s" repeatCount="indefinite"/></g>';
      });
    }else if(fx==="earthFx"){  // 地:環繞碎石
      [[0,0.5],[0.5,0],[1,0.5],[0.5,1]].forEach((sp,i)=>{
        const px=R.x+R.w*sp[0], py=R.y+R.h*sp[1], sz=Math.max(1.8,R.w*0.07);
        post += '<rect x="'+(px-sz)+'" y="'+(py-sz)+'" width="'+(sz*2)+'" height="'+(sz*2)+'" fill="'+E.core+'" opacity="0.5" rx="1">'
          + '<animateTransform attributeName="transform" type="rotate" from="0 '+cx+' '+cy+'" to="360 '+cx+' '+cy+'" dur="4s" begin="'+(i*1)+'s" repeatCount="indefinite"/></rect>';
      });
    }else if(fx==="holyFx"){  // 傳說:雙層聖域環與八方向星芒
      [0,45].forEach((start,i)=>{
        const rr=R.w*(.48+i*.13);
        post += '<g opacity=".78"><circle cx="'+cx+'" cy="'+cy+'" r="'+rr+'" fill="none" stroke="'+(i?E.c1:E.c2)+'" stroke-width="'+(1.2+i*.5)+'" stroke-dasharray="5 3"/>'
          + '<animateTransform attributeName="transform" type="rotate" from="'+start+' '+cx+' '+cy+'" to="'+(start+(i?360:-360))+' '+cx+' '+cy+'" dur="'+(4.5+i)+'s" repeatCount="indefinite"/></g>';
      });
      for(let i=0;i<8;i++){const a=i*Math.PI/4,px=cx+Math.cos(a)*R.w*.58,py=cy+Math.sin(a)*R.h*.48;
        post+='<circle cx="'+px+'" cy="'+py+'" r="'+Math.max(1.2,R.w*.035)+'" fill="'+E.c2+'"><animate attributeName="opacity" values=".15;1;.15" dur="1.4s" begin="'+(i*.12)+'s" repeatCount="indefinite"/></circle>';}
    }else if(fx==="voidFx"){  // 傳說:虛空裂片繞行，中央星核呼吸
      post+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+(R.w*.58)+'" ry="'+(R.h*.36)+'" fill="none" stroke="'+E.c2+'" stroke-width="1.4" stroke-dasharray="2 5" opacity=".8"><animateTransform attributeName="transform" type="rotate" from="0 '+cx+' '+cy+'" to="360 '+cx+' '+cy+'" dur="3.2s" repeatCount="indefinite"/></ellipse>';
      [[-.55,-.18],[.5,-.35],[.42,.38],[-.48,.34]].forEach((q,i)=>{const px=cx+R.w*q[0],py=cy+R.h*q[1],z=Math.max(2,R.w*.07);
        post+='<path d="M '+px+' '+(py-z)+' L '+(px+z)+' '+py+' L '+px+' '+(py+z)+' L '+(px-z)+' '+py+' Z" fill="'+(i%2?E.c1:E.c2)+'" opacity=".8"><animateTransform attributeName="transform" type="rotate" from="0 '+cx+' '+cy+'" to="360 '+cx+' '+cy+'" dur="'+(3+i*.35)+'s" repeatCount="indefinite"/></path>';});
    }else if(fx==="dragonFx"){  // 傳說:龍魂火紋由下向上盤旋
      [0,1,2].forEach(i=>{const x=cx+R.w*(i-1)*.24,y=R.y+R.h*.9,z=Math.max(2,R.w*.07);
        post+='<path d="M '+x+' '+y+' q '+(-z)+' '+(-z*2)+' 0 '+(-z*4)+' q '+(z*1.8)+' '+(z*2)+' 0 '+(z*4)+' Z" fill="'+(i===1?E.c2:E.c1)+'" opacity=".85"><animate attributeName="opacity" values=".25;1;0" dur="'+(1.15+i*.18)+'s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 0;'+((i-1)*3)+' '+(-R.h*.48)+'" dur="'+(1.15+i*.18)+'s" repeatCount="indefinite"/></path>';});
      post+='<path d="M '+(cx-R.w*.48)+' '+(cy+R.h*.1)+' Q '+cx+' '+(cy-R.h*.55)+' '+(cx+R.w*.48)+' '+(cy+R.h*.08)+' Q '+cx+' '+(cy+R.h*.5)+' '+(cx-R.w*.48)+' '+(cy+R.h*.1)+'" fill="none" stroke="'+E.c2+'" stroke-width="2" opacity=".55"><animate attributeName="stroke-dasharray" values="2 8;12 3;2 8" dur="2s" repeatCount="indefinite"/></path>';
    }
    // 細長的武器再加上刃身專屬粒子，帽子、衣服等其他部位維持原有特效。
    post += weaponElementFXSVG(fx, R, E);
    return { pre, post };
  }
  if(fx==="glow"){
    const c = avgPixelColor(pixels);
    // 柔邊外圍光暈:亮度/透明度提高,沿設計圖外輪廓發光,不生硬
    return { pre: auraSVG(R, pixels, c, 0.75, 1.8, gw, gh) + auraSVG(R, pixels, "#ffffff", 0.32, 1.2, gw, gh), post: shineSVG(R, "#ffffff", 3, 1.3) };
  }
  if(fx==="both"){
    const g = fxOverlaySVG("glow", R, pixels, gw, gh);
    const sp = fxOverlaySVG("sparkle", R, pixels, gw, gh);
    return {pre:g.pre, post:sp.post};
  }
  if(fx==="sparkle"){
    const spots=[[0.24,0.3],[0.72,0.46],[0.46,0.76]];
    let out="";
    spots.forEach((sp,i)=>{
      const cx=R.x+R.w*sp[0], cy=R.y+R.h*sp[1], s=Math.max(2.4, R.w*0.12);
      out += '<path d="M '+cx+' '+(cy-s)+' L '+(cx+s*0.28)+' '+(cy-s*0.28)+' L '+(cx+s)+' '+cy
        + ' L '+(cx+s*0.28)+' '+(cy+s*0.28)+' L '+cx+' '+(cy+s)+' L '+(cx-s*0.28)+' '+(cy+s*0.28)
        + ' L '+(cx-s)+' '+cy+' L '+(cx-s*0.28)+' '+(cy-s*0.28)+' Z" fill="#ffffff" opacity="0">'
        + '<animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="'+(i*0.55)+'s" repeatCount="indefinite"/></path>';
    });
    return {pre:"", post:out};
  }
  return {pre:"", post:""};
}
/* ── 平滑渲染:暴露角轉圓角 + 同色斜階補過渡(類 Scale2x)── */
function customPixelsSmoothSVG(pixels, R, gw, gh){
  if(!R || !pixels) return "";
  const cw = R.w/gw, ch = R.h/gh;
  const has = (x,y)=> pixels[x+","+y] !== undefined;
  const same = (x,y,c)=> pixels[x+","+y] === c;
  const r = Math.min(cw,ch)*0.5, b = Math.min(cw,ch)*0.08;
  let out = '<g>';
  for(const k in pixels){
    const c = pixels[k]; if(!c) continue;
    const q = k.split(","); const x = +q[0], y = +q[1];
    const L = has(x-1,y), Rt = has(x+1,y), U = has(x,y-1), D = has(x,y+1);
    const x0 = R.x+x*cw-(L?b:0), x1 = R.x+(x+1)*cw+(Rt?b:0);
    const y0 = R.y+y*ch-(U?b:0), y1 = R.y+(y+1)*ch+(D?b:0);
    const rtl = (!L&&!U)?r:0, rtr = (!Rt&&!U)?r:0, rbr = (!Rt&&!D)?r:0, rbl = (!L&&!D)?r:0;
    out += '<path d="M '+(x0+rtl)+' '+y0
      + ' L '+(x1-rtr)+' '+y0 + (rtr ? ' Q '+x1+' '+y0+' '+x1+' '+(y0+rtr) : ' L '+x1+' '+y0)
      + ' L '+x1+' '+(y1-rbr) + (rbr ? ' Q '+x1+' '+y1+' '+(x1-rbr)+' '+y1 : ' L '+x1+' '+y1)
      + ' L '+(x0+rbl)+' '+y1 + (rbl ? ' Q '+x0+' '+y1+' '+x0+' '+(y1-rbl) : ' L '+x0+' '+y1)
      + ' L '+x0+' '+(y0+rtl) + (rtl ? ' Q '+x0+' '+y0+' '+(x0+rtl)+' '+y0 : '')
      + ' Z" fill="'+c+'"/>';
    if(same(x+1,y+1,c) && !Rt && !D){
      const cx = R.x+(x+1)*cw, cy = R.y+(y+1)*ch, sr = r*0.9;
      out += '<path d="M '+(cx-sr)+' '+cy+' Q '+cx+' '+cy+' '+cx+' '+(cy+sr)
        + ' L '+(cx+sr)+' '+cy+' Q '+cx+' '+cy+' '+cx+' '+(cy-sr)+' Z" fill="'+c+'"/>';
    }
    if(same(x+1,y-1,c) && !Rt && !U){
      const cx = R.x+(x+1)*cw, cy = R.y+y*ch, sr = r*0.9;
      out += '<path d="M '+(cx-sr)+' '+cy+' Q '+cx+' '+cy+' '+cx+' '+(cy-sr)
        + ' L '+(cx+sr)+' '+cy+' Q '+cx+' '+cy+' '+cx+' '+(cy+sr)+' Z" fill="'+c+'"/>';
    }
  }
  return out+'</g>';
}
/* ── 設計交換格式(讓 GPT/Gemini 用文字網格幫學生畫圖)──
 * 格式:16 行 × 16 字元;「.」=透明,其餘字元依圖例對應色碼。
 * 解析器高度容錯:忽略說明文字、允許字元間空格、可用「X=#RRGGBB」自訂色。 */
   // 依序對應 PALETTE 24 色

function stdLegend(){
  const m = {};
  for(let i=0;i<LEGEND_KEYS.length && i<PALETTE.length;i++) m[LEGEND_KEYS[i]] = PALETTE[i];
  return m;
}
function normHex(c){
  if(/^#[0-9a-fA-F]{3}$/.test(c)) return ("#"+c[1]+c[1]+c[2]+c[2]+c[3]+c[3]).toLowerCase();
  return c.toLowerCase();
}
function designToText(type, pixels){
  const gw = gridW(type), gh = gridH(type);
  const colors = [...new Set(Object.values(pixels).map(normHex))];
  const std = stdLegend();
  const rev = {}; for(const k in std) rev[std[k].toLowerCase()] = k;
  const legend = {}; let extraIdx = 0;
  const charOf = {};
  const EXTRA = "abcdefghijklmnopqrstuvwxyz";
  for(const c of colors){
    let ch = rev[c.toLowerCase()];
    if(!ch){ ch = EXTRA[extraIdx++] || "?"; }
    charOf[c] = ch; legend[ch] = c;
  }
  let rows = [];
  for(let y=0;y<gh;y++){
    let row = "";
    for(let x=0;x<gw;x++){ const c = pixels[x+","+y]; row += c ? charOf[normHex(c)] : "."; }
    rows.push(row);
  }
  return "部位:"+TYPE_NAME[type]+"\n尺寸:"+gw+"x"+gh+"\n圖例:. =透明 "
    + Object.entries(legend).map(([ch,c])=>ch+"="+c).join(" ")
    + "\n" + rows.join("\n");
}
function textToDesign(text, type){
  if(!text) return {ok:false, msg:"沒有內容"};
  const gw = gridW(type), gh = gridH(type);
  const legend = stdLegend();
  for(const m of text.matchAll(/(\S)\s*=\s*[^#\n]{0,12}(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))(?![0-9a-fA-F])/g)){
    if(m[1] !== ".") legend[m[1]] = normHex(m[2]);
  }
  // 寬容解析:凡看起來像網格列(只含圖例字元/點,且長度接近 gw)都收;之後統一補齊/裁切
  const rawRows = [];
  for(const raw of text.split(/\r?\n/)){
    const line = raw.replace(/[\s,|]/g, "");
    if(!line || line.includes("=") || /[:：]/.test(line)) continue;      // 跳過圖例行/說明行
    // 長度落在 gw 的合理範圍(半寬~1.5倍)才視為網格列
    if(line.length >= Math.floor(gw*0.5) && line.length <= gw*2) rawRows.push(line);
    if(rawRows.length >= gh*2) break;
  }
  if(rawRows.length < Math.floor(gh*0.5)) return {ok:false, msg:TYPE_NAME[type]+"需要約 "+gh+" 行網格(每行約 "+gw+" 字元),目前只找到 "+rawRows.length+" 行。請確認 AI 有輸出網格。"};
  // 行數校正:多的裁掉、少的補透明行;每行寬度校正:長的裁、短的右補「.」並置中
  const rows = [];
  for(let y=0;y<gh;y++){
    let line = rawRows[y] || "".padEnd(gw, ".");
    if(line.length > gw){                                   // 過長:置中裁切
      const start = Math.floor((line.length-gw)/2);
      line = line.slice(start, start+gw);
    }else if(line.length < gw){                             // 過短:置中補透明
      const pad = gw - line.length, left = Math.floor(pad/2);
      line = ".".repeat(left) + line + ".".repeat(pad-left);
    }
    rows.push(line);
  }
  const pixels = {}; let unknown = 0, filled = 0;
  for(let y=0;y<gh;y++) for(let x=0;x<gw;x++){
    const ch = rows[y][x];
    if(ch === "." || ch === "0" || ch === undefined) continue;
    const c = legend[ch];
    if(c){ pixels[x+","+y] = c; filled++; }
    else unknown++;
  }
  if(filled < 5) return {ok:false, msg:"有效像素太少("+filled+" 格),可能是圖例字元對不上,或圖太小。可試著再請 AI 產一次。"};
  return {ok:true, pixels, unknown, filled};
}
function aiPromptFor(type){
  const gw = gridW(type), gh = gridH(type);
  const std = stdLegend();
  const lg = LEGEND_KEYS.split("").map((ch,i)=>ch+"="+LEGEND_ZH[i]+"("+std[ch]+")").join(" ");
  return "請幫我設計一個 "+gw+"×"+gh+"(寬"+gw+"格、高"+gh+"格)的像素圖,部位:【"+TYPE_NAME[type]+"】,主題:(把你的想法寫在這裡)\n"
    + "輸出規則:\n"
    + "1. 只輸出 "+gh+" 行、每行恰好 "+gw+" 個字元的網格,前後不要任何其他文字\n"
    + "2. 用「.」代表透明背景,圖案請置中、輪廓清楚"
    + (type==="weapon" ? "(直立長條構圖,例如劍尖朝上)" : "")
    + (type==="back" ? "(⚠️ 這是穿在背後的裝備,必須「左右完全對稱」——以畫布正中央為中線,左右鏡像;適合翅膀、斗篷、背包等,請善用整個寬度)" : "")
    + "\n"
    + "3. 顏色字元圖例:"+lg+"\n"
    + "4. 需要圖例以外的顏色時,在網格上方加一行,例如:x=#ff00ff";
}

/* 統一入口:像素作品 + 特效 */
/* 圖片變換:位移→繞區域中心旋轉→繞中心縮放;限幅防失控 */
function clampImgT(t){
  return {
    x: Math.max(-40, Math.min(40, t.x||0)),
    y: Math.max(-40, Math.min(40, t.y||0)),
    s: Math.max(0.3, Math.min(3, t.s||1)),
    r: ((t.r||0) % 360),
  };
}
function imgTransform(t0, cx, cy){
  const t = clampImgT(t0||{});
  if(!t.x && !t.y && t.s===1 && !t.r) return "";
  return ' transform="translate('+t.x+' '+t.y+') rotate('+t.r+' '+cx+' '+cy+') translate('+cx+' '+cy+') scale('+t.s+') translate('+(-cx)+' '+(-cy)+')"';
}
function customArt(itemLike, slot, regions){
  const R0 = (regions || CUSTOM_REGION)[slot];
  if(!R0) return "";
  const gw = itemLike.gw || itemLike.grid || 12;
  const gh = itemLike.gh || itemLike.grid || 12;
  if(itemLike.img){
    const o = fxOverlaySVG(itemLike.fx, R0, itemLike.pixels, gw, gh);
    const tr = imgTransform(itemLike.imgT, R0.x+R0.w/2, R0.y+R0.h/2);
    return o.pre
      + '<g'+tr+'><image href="'+itemLike.img+'" x="'+R0.x+'" y="'+R0.y+'" width="'+R0.w+'" height="'+R0.h+'" preserveAspectRatio="xMidYMid meet"/></g>'
      + o.post;
  }
  const cell = Math.min(R0.w/gw, R0.h/gh);          // 等比:格子必為正方
  const R = { x: R0.x+(R0.w-cell*gw)/2, y: R0.y+(R0.h-cell*gh)/2, w: cell*gw, h: cell*gh };
  const px = (itemLike.smooth ? customPixelsSmoothSVG : customPixelsSVG)(itemLike.pixels, R, gw, gh);
  const o = fxOverlaySVG(itemLike.fx, R, itemLike.pixels, gw, gh);
  return o.pre + px + o.post;
}

/* ── 編輯器歷史(上一步/下一步)─────────────────── */
function edSnapshot(ed){
  ed.undo = ed.undo || []; ed.redo = [];
  ed.undo.push(JSON.stringify(ed.pixels));
  if(ed.undo.length > 30) ed.undo.shift();
}
function edUndo(ed){
  if(!ed.undo || !ed.undo.length) return false;
  (ed.redo = ed.redo || []).push(JSON.stringify(ed.pixels));
  ed.pixels = JSON.parse(ed.undo.pop());
  return true;
}
/* 畫布平移:超出邊界的像素裁掉(呼叫端先快照,可用上一步反悔) */
function shiftPixels(pixels, dx, dy, gw, gh){
  const W = gw || GRID, H = gh || GRID;
  const out = {}; let dropped = 0;
  for(const k in pixels){
    const q = k.split(","); const x = +q[0]+dx, y = +q[1]+dy;
    if(x>=0 && x<W && y>=0 && y<H) out[x+","+y] = pixels[k];
    else dropped++;
  }
  return {pixels:out, dropped};
}
function edRedo(ed){
  if(!ed.redo || !ed.redo.length) return false;
  (ed.undo = ed.undo || []).push(JSON.stringify(ed.pixels));
  ed.pixels = JSON.parse(ed.redo.pop());
  return true;
}
/* 工坊快捷草稿：RO 式像素輪廓；服裝與鞋褲優先覆蓋素體對應部位。 */
function starterPixels(type, gw, gh, kind, main){
  const out={}, ink="#211c24", gold="#ffd56a", mid=Math.floor(gw/2);
  const tone=(hex,p)=>{
    const m=String(hex||"").match(/^#([0-9a-f]{6})$/i); if(!m) return p>0?"#f3b6ae":"#7b2924";
    const n=parseInt(m[1],16), to=p>0?255:0, a=Math.abs(p);
    const c=s=>Math.max(0,Math.min(255,Math.round(((n>>s)&255)*(1-a)+to*a))).toString(16).padStart(2,"0");
    return "#"+c(16)+c(8)+c(0);
  };
  main=/^#[0-9a-f]{6}$/i.test(main||"")?main:"#d0483e";
  const shadow=tone(main,-.34), light=tone(main,.38);
  const put=(x,y,c)=>{ if(x>=0&&x<gw&&y>=0&&y<gh) out[x+","+y]=c; };
  const box=(x0,y0,x1,y1,c)=>{ for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) put(x,y,c); };
  const outlineBox=(x0,y0,x1,y1,c)=>{box(x0,y0,x1,y1,ink);if(x1-x0>1&&y1-y0>1)box(x0+1,y0+1,x1-1,y1-1,c);};
  const pair=(x0,x1,y0,y1,c)=>{const gap=Math.max(1,Math.round(gw*.08)),cx=mid;outlineBox(x0,y0,cx-gap,y1,c);outlineBox(cx+gap,x1,y0,y1,c);};
  if(kind==="runner"){
    const y=Math.max(1,Math.floor(gh*.28)),gap=Math.max(1,Math.round(gw*.06));
    pair(1,gw-2,y,gh-2,main); box(1,gh-3,mid-gap,gh-1,ink);box(mid+gap,gh-3,gw-2,gh-1,ink);
    box(2,gh-4,mid-gap-1,gh-3,"#f3f5fa");box(mid+gap+1,gh-4,gw-3,gh-3,"#f3f5fa");put(Math.floor(gw*.25),y+1,light);put(Math.floor(gw*.75),y+1,light);
  }else if(kind==="boot"){
    const y=1,gap=Math.max(1,Math.round(gw*.07)); pair(2,gw-3,y,gh-2,main);
    box(1,gh-4,mid-gap,gh-1,ink);box(mid+gap,gh-4,gw-2,gh-1,ink);box(2,gh-4,mid-gap-1,gh-2,shadow);box(mid+gap+1,gh-4,gw-3,gh-2,shadow);
    box(3,Math.floor(gh*.38),mid-gap-1,Math.floor(gh*.48),gold);box(mid+gap+1,Math.floor(gh*.38),gw-4,Math.floor(gh*.48),gold);
  }else if(kind==="magicShoe"){
    const y=Math.max(1,Math.floor(gh*.2)),gap=Math.max(1,Math.round(gw*.06));pair(2,gw-3,y,gh-2,main);
    box(2,gh-4,mid-gap,gh-1,ink);box(mid+gap,gh-4,gw-2,gh-1,ink);box(3,gh-4,mid-gap-1,gh-2,shadow);box(mid+gap+1,gh-4,gw-3,gh-2,shadow);
    [[Math.floor(gw*.2),1],[Math.floor(gw*.8),1],[Math.floor(gw*.3),Math.floor(gh*.35)],[Math.floor(gw*.7),Math.floor(gh*.35)]].forEach(p=>{put(p[0],p[1],gold);put(p[0]-1,p[1],light);put(p[0]+1,p[1],light);});
  }else if(kind==="cap"){
    const y=Math.floor(gh*.32);for(let r=0;r<Math.floor(gh*.46);r++){const half=Math.floor(gw*(.22+.18*r/Math.max(1,gh*.46)));box(mid-half,y+r,mid+half,y+r,main);put(mid-half,y+r,ink);put(mid+half,y+r,ink);}box(Math.floor(gw*.08),Math.floor(gh*.68),Math.floor(gw*.58),Math.floor(gh*.82),ink);box(Math.floor(gw*.1),Math.floor(gh*.69),Math.floor(gw*.56),Math.floor(gh*.76),shadow);box(mid-3,y+1,mid+3,y+2,light);
  }else if(kind==="crown"){
    const y=Math.floor(gh*.48),x0=Math.floor(gw*.12),x1=gw-1-x0;outlineBox(x0,y,x1,gh-3,main);
    [Math.floor(gw*.2),mid,Math.floor(gw*.8)].forEach((x,i)=>{const top=i===1?1:Math.floor(gh*.16);for(let yy=top;yy<y;yy++){const d=Math.max(0,Math.floor((yy-top)/4));box(x-d,yy,x+d,yy,yy===top?gold:main);}});box(x0+2,y+2,x1-2,y+3,gold);
  }else if(kind==="wizardHat"){
    const brim=Math.floor(gh*.72);outlineBox(1,brim,gw-2,gh-3,main);for(let y=2;y<brim;y++){const t=(y-2)/Math.max(1,brim-2),half=Math.max(1,Math.floor(1+t*gw*.28));box(mid-half,y,mid+half,y,main);put(mid-half,y,ink);put(mid+half,y,ink);if(y%6===0)put(mid+half-1,y,light);}box(Math.floor(gw*.25),brim-3,Math.floor(gw*.75),brim,gold);put(mid,1,gold);
  }else if(kind==="tunic"){
    const y=1;outlineBox(1,y,gw-2,gh-2,main);box(0,y+3,Math.floor(gw*.24),Math.floor(gh*.62),ink);box(1,y+4,Math.floor(gw*.24),Math.floor(gh*.58),main);box(Math.floor(gw*.76),y+3,gw-1,Math.floor(gh*.62),ink);box(Math.floor(gw*.76),y+4,gw-2,Math.floor(gh*.58),main);box(Math.floor(gw*.18),Math.floor(gh*.68),Math.floor(gw*.82),Math.floor(gh*.8),shadow);box(mid-1,y+3,mid+1,gh-4,gold);
  }else if(kind==="armor"){
    outlineBox(1,1,gw-2,gh-2,main);outlineBox(0,2,Math.floor(gw*.26),Math.floor(gh*.46),shadow);outlineBox(Math.floor(gw*.74),2,gw-1,Math.floor(gh*.46),shadow);box(Math.floor(gw*.2),Math.floor(gh*.48),Math.floor(gw*.8),Math.floor(gh*.58),ink);box(Math.floor(gw*.24),Math.floor(gh*.5),Math.floor(gw*.76),Math.floor(gh*.55),gold);box(mid-1,2,mid+1,gh-3,light);
  }else if(kind==="robe"){
    for(let y=1;y<gh-1;y++){const t=y/(gh-1),half=Math.min(Math.floor(gw*.48),Math.floor(gw*(.25+t*.22)));box(mid-half,y,mid+half,y,main);put(mid-half,y,ink);put(mid+half,y,ink);if(y%5===0)put(mid+half-1,y,light);}box(0,3,Math.floor(gw*.25),Math.floor(gh*.55),ink);box(1,4,Math.floor(gw*.24),Math.floor(gh*.52),main);box(Math.floor(gw*.75),3,gw-1,Math.floor(gh*.55),ink);box(Math.floor(gw*.76),4,gw-2,Math.floor(gh*.52),main);box(mid-1,2,mid+1,gh-3,gold);
  }else if(kind==="shorts"){
    outlineBox(1,1,gw-2,Math.floor(gh*.76),main);box(2,2,gw-3,Math.floor(gh*.2),shadow);box(mid-1,Math.floor(gh*.45),mid+1,gh-2,ink);box(1,Math.floor(gh*.68),mid-2,gh-2,ink);box(mid+2,Math.floor(gh*.68),gw-2,gh-2,ink);box(2,Math.floor(gh*.68),mid-3,gh-3,main);box(mid+3,Math.floor(gh*.68),gw-3,gh-3,main);box(Math.floor(gw*.2),3,Math.floor(gw*.8),4,gold);
  }else if(kind==="jeans"){
    outlineBox(1,1,gw-2,Math.floor(gh*.42),main);pair(1,gw-2,Math.floor(gh*.34),gh-2,main);box(mid-1,Math.floor(gh*.3),mid+1,gh-1,ink);box(2,2,gw-3,Math.floor(gh*.14),shadow);box(Math.floor(gw*.17),Math.floor(gh*.2),Math.floor(gw*.38),Math.floor(gh*.27),light);box(Math.floor(gw*.62),Math.floor(gh*.2),Math.floor(gw*.83),Math.floor(gh*.27),light);
  }else if(kind==="legguard"){
    outlineBox(1,1,gw-2,Math.floor(gh*.42),shadow);pair(1,gw-2,Math.floor(gh*.34),gh-2,main);box(mid-1,Math.floor(gh*.28),mid+1,gh-1,ink);[Math.floor(gh*.5),Math.floor(gh*.75)].forEach(y=>{box(2,y,mid-2,y+1,gold);box(mid+2,y,gw-3,y+1,gold);});box(2,2,gw-3,Math.floor(gh*.13),gold);
  }else if(kind==="cape"){
    for(let y=1;y<gh-1;y++){ const half=Math.max(1,Math.floor((y/gh)*gw*.42)); box(mid-half,y,mid+half,y,main); put(mid-half,y,ink); put(mid+half,y,ink); } box(mid-1,1,mid+1,Math.floor(gh*.25),light);
  }else if(kind==="wings"){
    for(let y=1;y<gh-1;y++){ const d=Math.max(1,Math.floor(Math.sin(Math.PI*y/gh)*gw*.42)); box(mid-d,y,mid-1,y,main); box(mid+1,y,mid+d,y,main); put(mid-d,y,ink); put(mid+d,y,ink); } box(mid-1,1,mid+1,gh-2,light);
  }else if(kind==="pack"){
    const x0=Math.floor(gw*.2), x1=Math.floor(gw*.8), y0=Math.floor(gh*.16), y1=gh-3; box(x0,y0,x1,y1,ink); box(x0+1,y0+1,x1-1,y1-1,main); box(x0+2,Math.floor(gh*.42),x1-2,Math.floor(gh*.48),light); box(Math.floor(gw*.32),y0-2,Math.floor(gw*.68),y0+1,ink);
  }else if(kind==="blade"){
    for(let y=1;y<gh-7;y++){const d=Math.max(1,Math.round((gh-7-y)/Math.max(5,gh*.3)));box(mid-d,y,mid+d,y,ink);if(d>0)box(mid-d+1,y,mid+d-1,y,y<4?"#f5fbff":light);put(mid+d,y,shadow);}box(mid-5,gh-7,mid+5,gh-5,ink);box(mid-4,gh-6,mid+4,gh-6,gold);box(mid-1,gh-5,mid+1,gh-1,ink);put(mid,gh-4,main);put(mid,gh-3,main);put(mid,gh-2,gold);
  }else if(kind==="wand"){
    box(mid-1,4,mid+1,gh-3,ink); box(mid,5,mid,gh-4,main);
    [[mid,1],[mid-2,2],[mid+2,2],[mid-3,4],[mid+3,4],[mid,3]].forEach(p=>put(p[0],p[1],light));
  }else if(kind==="crest" && type==="weapon"){
    for(let y=2;y<gh-5;y++){const t=(y-2)/Math.max(1,gh-7),half=Math.max(2,Math.floor(gw*(.36-.2*t)));box(mid-half,y,mid+half,y,main);put(mid-half,y,ink);put(mid+half,y,ink);}box(mid-Math.floor(gw*.34),2,mid+Math.floor(gw*.34),4,ink);box(mid-1,5,mid+1,gh-7,gold);put(mid,gh-4,gold);
  }else if(kind==="crest"){
    for(let y=1;y<gh-2;y++){ const d=Math.max(1,Math.round((1-Math.abs((y-gh/2)/(gh/2)))*Math.max(2,gw*.42))); box(mid-d,y,mid+d,y,main); put(mid-d,y,ink); put(mid+d,y,ink); }
    box(mid-1,Math.floor(gh*.28),mid+1,Math.floor(gh*.72),light);
  }else if(kind==="frame"){
    for(let x=0;x<gw;x++){ put(x,0,ink); put(x,gh-1,ink); } for(let y=0;y<gh;y++){ put(0,y,ink); put(gw-1,y,ink); }
    for(let y=2;y<gh-2;y++) for(let x=2;x<gw-2;x++) if((x+y)%3===0) put(x,y,main);
  }else{ // 對稱徽記：適合帽子、衣服、背飾、鞋子等任何部位
    for(let y=1;y<gh-1;y++){ const d=Math.max(1,Math.round(Math.sin(Math.PI*y/(gh-1))*Math.max(2,gw*.38))); box(mid-d,y,mid+d,y,main); put(mid-d,y,ink); put(mid+d,y,ink); }
    for(let y=Math.floor(gh*.28);y<Math.floor(gh*.72);y++) put(mid,y,light);
  }
  return out;
}
function starterThumb(type,kind,main){
  const gw=gridW(type),gh=gridH(type),pixels=starterPixels(type,gw,gh,kind,main||"#d0483e");
  return customThumb({pixels,gw,gh,smooth:false},38);
}

function roSlot(s, slot, override){
  if(override && override.type===slot) return customArt(override, slot, RO_REGION);
  const id = s[slot+"Id"];
  if(!id) return "";
  if(id>=1000){ const it = itemById(id); return it ? customArt(it, slot, RO_REGION) : ""; }
  const petItem=itemById(id),petVisual=petCraftVisualItem(petItem);
  if(petVisual) return customArt(petVisual,slot,RO_REGION);
  const png = artImg("item:"+id);
  if(png) return png;
  return (RO_ART[slot] && RO_ART[slot][id]) || "";
}
/* 🎯 素體對位參數(誠兆用真裝備對位工具調校:dx/dy位移 + scale縮放,以裝備原座標中心50,55為基準) */
/* 新版大頭短身素體專用對位：裝備收進頭、軀幹、短褲與腳掌的實際範圍。
   同一份基準同時供商店、學生紙娃娃與工坊虛線框使用，避免三個畫面不同步。 */

   // 素體 image 定位
/* ✨ 傳說裝備發光:沿裝備輪廓的漸層透明紅光,會呼吸(SVG 濾鏡,離線可用) */

/* 該部位穿的是不是傳說裝備 */
function isLegendSlot(s, slot, override){
  if(override && override.type === slot) return false;      // 工坊預覽中的作品不算
  const it = itemById(s[slot+"Id"]);
  return !!(it && it.rarity === "Legendary");
}

// 註冊與紙娃娃校正皆以刺蝟短髮男生（male2）為 100% 對位基準。

// 素體工坊的唯一規格：原始紙娃娃畫布與腳底基準。所有自訂素體都回填到此規格，裝備才能共用座標。

function dyedBaseSrc(s){
  if(!(s&&s.baseVariant&&BASE_VARIANTS[s.baseVariant])) return "";
  const k = s.baseVariant;
  const hair = (s&&s.quickHair)||"original", eye = "original"; // v130:快速造型只保留髮色，眼睛一律使用素體原圖
  // 棕髮就是每款完整重繪素體的原始髮色；其餘顏色使用同一素體染色版。
  return ((hair==="original" || hair==="brown") && eye==="original") ? BASE_VARIANTS[k] : "assets/base-dye/"+k+"-"+hair+"-"+eye+".png";
}
function A_base(s){ const A=(state&&state.art)||{}; const g=s.gender||"male"; const P=(s.art)||{};
  return P["base:custom:"+g] || dyedBaseSrc(s) || A["base:"+s.job+":"+g] || A["base:"+g] || A["base:male"] || A["base:"+s.job+":"+tierOf(s)] || A["base:"+s.job] || ""; }

/* 🪄 瀏覽器端自動去背:去掉四角的單色背景(BFS flood-fill,容差判定) */
function autoRemoveBg(canvas){
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const img = ctx.getImageData(0,0,W,H);
  const d = img.data;
  // 先判斷圖片是否「本來就有透明背景」(四角皆透明)
  const cornerAlpha = [ d[(1*W+1)*4+3], d[(1*W+(W-2))*4+3], d[((H-2)*W+1)*4+3], d[((H-2)*W+(W-2))*4+3] ];
  const alreadyTransparent = cornerAlpha.every(a=> a < 30);
  if(alreadyTransparent){
    // 已透明:不做 flood-fill(四角取樣的顏色無意義),只清輪廓白邊
    deFringe(canvas, null);
    return;
  }
  // 取四角平均色當背景基準
  const corner = (x,y)=>{ const i=(y*W+x)*4; return [d[i],d[i+1],d[i+2]]; };
  const cs = [corner(1,1), corner(W-2,1), corner(1,H-2), corner(W-2,H-2)];
  const bg = [0,1,2].map(k=> Math.round(cs.reduce((a,c)=>a+c[k],0)/cs.length));
  const TOL = 42;   // 顏色容差(背景色±這個範圍算背景)
  const near = (i)=> Math.abs(d[i]-bg[0])<TOL && Math.abs(d[i+1]-bg[1])<TOL && Math.abs(d[i+2]-bg[2])<TOL;
  // 從四邊 flood-fill,只清「連到邊緣」的背景(保護角色內部同色區)
  const visited = new Uint8Array(W*H);
  const stack = [];
  for(let x=0;x<W;x++){ stack.push([x,0]); stack.push([x,H-1]); }
  for(let y=0;y<H;y++){ stack.push([0,y]); stack.push([W-1,y]); }
  while(stack.length){
    const [x,y] = stack.pop();
    if(x<0||x>=W||y<0||y>=H) continue;
    const p = y*W+x; if(visited[p]) continue;
    const i = p*4; if(!near(i)) continue;
    visited[p] = 1; d[i+3] = 0;   // 設透明
    stack.push([x+1,y]); stack.push([x-1,y]); stack.push([x,y+1]); stack.push([x,y-1]);
  }
  ctx.putImageData(img,0,0);
  deFringe(canvas, bg);          // 🧹 清掉邊緣的白/淺色毛邊(抗鋸齒過渡像素)
}
/* 🧹 去毛邊/去白邊:清掉輪廓上殘留的白色或淺色像素。
   不依賴背景色判定(圖片本身可能已是透明底,四角取樣無效),
   改為直接偵測「位在輪廓上、且又亮又低飽和(白/灰)」的像素並清除。 */
function deFringe(canvas, bg, passes){
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const img = ctx.getImageData(0,0,W,H);
  const d = img.data;
  const N = passes || 8;
  const bgDist = (i)=> bg ? (Math.abs(d[i]-bg[0]) + Math.abs(d[i+1]-bg[1]) + Math.abs(d[i+2]-bg[2])) : 9999;
  for(let pass=0; pass<N; pass++){
    const kill = [];
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const p = y*W+x, i = p*4;
      if(d[i+3] < 30) continue;                       // 已透明
      let onEdge = false;                             // 是否位在輪廓上(含對角線八方向)
      for(let dy=-1; dy<=1 && !onEdge; dy++) for(let dx=-1; dx<=1; dx++){
        if(!dx && !dy) continue;
        const nx = x+dx, ny = y+dy;
        if(nx<0||nx>=W||ny<0||ny>=H){ onEdge = true; break; }
        if(d[(ny*W+nx)*4+3] < 30){ onEdge = true; break; }
      }
      if(!onEdge) continue;
      const r=d[i], g=d[i+1], b=d[i+2];
      const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
      const lum = (r+g+b)/3, sat = mx-mn;
      const whiteish = lum > (206 - pass*3) && sat < 42;   // 白/淺灰毛邊
      const nearBg   = bgDist(i) < (150 - pass*15);        // 若有有效背景色,也一併清
      if(whiteish || nearBg) kill.push(i);
    }
    if(!kill.length) break;
    for(const i of kill) d[i+3] = 0;
  }
  ctx.putImageData(img,0,0);
  bleedEdges(canvas);   // 🩹 邊緣色彩滲透:避免縮放插值時把透明像素的白色RGB混進來
}
/* 🩹 邊緣色彩滲透(alpha bleeding):
   透明像素若仍保留白色 RGB,瀏覽器縮放時的插值會把白色混入可見邊緣,形成細白邊。
   解法:把透明像素的 RGB 換成鄰近可見像素的平均色(alpha 維持 0),向外擴散數圈。 */
function bleedEdges(canvas, rounds){
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const img = ctx.getImageData(0,0,W,H);
  const d = img.data;
  const R = rounds || 4;
  let known = new Uint8Array(W*H);
  for(let p=0;p<W*H;p++) known[p] = d[p*4+3] > 30 ? 1 : 0;
  for(let r=0; r<R; r++){
    const next = new Uint8Array(known);
    const writes = [];
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const p = y*W+x;
      if(known[p]) continue;
      let sr=0, sg=0, sb=0, n=0;
      for(let dy=-1; dy<=1; dy++) for(let dx=-1; dx<=1; dx++){
        if(!dx && !dy) continue;
        const nx=x+dx, ny=y+dy;
        if(nx<0||nx>=W||ny<0||ny>=H) continue;
        const q = ny*W+nx;
        if(!known[q]) continue;
        const j = q*4; sr+=d[j]; sg+=d[j+1]; sb+=d[j+2]; n++;
      }
      if(n){ writes.push([p*4, sr/n, sg/n, sb/n]); next[p] = 1; }
    }
    if(!writes.length) break;
    for(const w of writes){ d[w[0]]=w[1]; d[w[0]+1]=w[2]; d[w[0]+2]=w[3]; }   // 只改 RGB,alpha 仍為 0
    known = next;
  }
  ctx.putImageData(img,0,0);
}
/* 🖊 自動補黑邊:沿角色輪廓外擴一圈深色描邊,與基準素體的漫畫風一致 */
function addOutline(canvas, thickness){
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const img = ctx.getImageData(0,0,W,H);
  const d = img.data;
  const T = thickness || Math.max(2, Math.round(W*0.010));
  const solid = new Uint8Array(W*H);
  for(let p=0;p<W*H;p++) solid[p] = d[p*4+3] > 30 ? 1 : 0;
  // 由內往外擴 T 圈
  let cur = solid;
  for(let t=0;t<T;t++){
    const next = new Uint8Array(cur);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const p = y*W+x;
      if(cur[p]) continue;
      if((x>0 && cur[p-1]) || (x<W-1 && cur[p+1]) || (y>0 && cur[p-W]) || (y<H-1 && cur[p+W])){
        next[p] = 1;
        const i = p*4;
        if(!solid[p]){ d[i]=20; d[i+1]=20; d[i+2]=20; d[i+3]=255; }
      }
    }
    cur = next;
  }
  ctx.putImageData(img,0,0);
  bleedEdges(canvas);   // 🩹 黑邊加完再滲透一次,確保外圍透明像素帶的是黑邊色
}
/* 計算不透明像素的邊界框(裁切用) */
function alphaBBox(canvas){
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const d = ctx.getImageData(0,0,W,H).data;
  let lo=W, hi=0, top=H, bot=0, found=false;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(d[(y*W+x)*4+3] > 20){ found=true; if(x<lo)lo=x; if(x>hi)hi=x; if(y<top)top=y; if(y>bot)bot=y; }
  }
  if(!found) return {x:0,y:0,w:W,h:H};
  return {x:lo, y:top, w:hi-lo+1, h:bot-top+1};
}
/* 🎨 工坊預覽用:複製學生但脫掉所有裝備,只留素體
   → 讓虛線框與正在設計的作品精準對應,不被現有裝備干擾 */
function edBareStudent(s, keepType){
  const b = Object.assign({}, s);
  ["hat","clothes","pants","weapon","back","shoes","hair","eyes","brows","nose"].forEach(k=>{
    if(k !== keepType) b[k+"Id"] = null;
  });
  return b;
}
function edFitBox(type, s, itemLike){                        // 📐 工坊預覽:追蹤作品本體，不只是裝備槽位
  const rg = RO_REGION[type]; if(!rg) return "";
  let x = rg.x, y = rg.y, w = rg.w, h = rg.h;
  if(!(itemLike && itemLike.img)){
    const gw = (itemLike && (itemLike.gw || itemLike.grid)) || gridW(type);
    const gh = (itemLike && (itemLike.gh || itemLike.grid)) || gridH(type);
    const cell = Math.min(w/gw, h/gh);
    w = cell*gw; h = cell*gh; x += (rg.w-w)/2; y += (rg.h-h)/2;
  }
  // 圖片模式以匯入時偵測到的不透明內容為準，避開透明邊界造成的大框。
  const ib = (itemLike && itemLike.img && itemLike.imgBox) || {x:0,y:0,w:1,h:1};
  let pts = [[x+w*ib.x,y+h*ib.y],[x+w*(ib.x+ib.w),y+h*ib.y],
    [x+w*(ib.x+ib.w),y+h*(ib.y+ib.h)],[x+w*ib.x,y+h*(ib.y+ib.h)]];
  if(itemLike && itemLike.img){
    const t = clampImgT(itemLike.imgT||{}), cx=x+w/2, cy=y+h/2, a=t.r*Math.PI/180;
    pts = pts.map(p=>{ const dx=(p[0]-cx)*t.s, dy=(p[1]-cy)*t.s;
      return [cx+t.x+dx*Math.cos(a)-dy*Math.sin(a), cy+t.y+dx*Math.sin(a)+dy*Math.cos(a)]; });
  }
  const useBase = !s || !!A_base(s), f = useBase ? BASE_FIT[type] : null;
  if(f){
    const sx = f.sx!==undefined ? f.sx : (f.sc||1), sy = f.sy!==undefined ? f.sy : (f.sc||1);
    const fitCx = f.center ? x+w/2 : 50, tx = f.dx+50-fitCx*sx, ty = f.dy+55-55*sy;
    pts = pts.map(p=>[p[0]*sx+tx,p[1]*sy+ty]);
  }
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]), bx=Math.min.apply(null,xs), by=Math.min.apply(null,ys);
  const bw=Math.max(1,Math.max.apply(null,xs)-bx), bh=Math.max(1,Math.max.apply(null,ys)-by);
  const vbY0=-20, vbH=122, sz=130, hpx=Math.round(sz*1.22);
  const left=bx/100*sz, top=(by-vbY0)/vbH*hpx, pw=bw/100*sz, ph=bh/vbH*hpx;
  const isCenter=!!(f&&f.center);
  return '<div style="position:absolute;left:'+left.toFixed(1)+'px;top:'+top.toFixed(1)+'px;width:'+pw.toFixed(1)+'px;height:'+ph.toFixed(1)+'px;'
    + 'border:2px dashed var(--gold);border-radius:3px;pointer-events:none"></div>'
    + (isCenter ? '<div style="position:absolute;left:'+(left+pw/2).toFixed(1)+'px;top:'+top.toFixed(1)+'px;'
        + 'width:0;height:'+ph.toFixed(1)+'px;border-left:1px dashed rgba(240,180,41,.75);pointer-events:none"></div>' : "");
}
function dollRO(s, size, override){
  const back = roSlot(s,"back",override);
  const clothes = roSlot(s,"clothes",override);
  const pants0 = roSlot(s,"pants",override);
  const shoes0 = roSlot(s,"shoes",override);
  // 🚶 鞋子拆左右腳:同一鞋圖裁切左右半邊各成一層,走路時交替抬步(任何鞋圖通用)
  const shoes = shoes0
    ? '<clipPath id="roClipL"><rect x="0" y="-20" width="50" height="142"/></clipPath>'
    + '<clipPath id="roClipR"><rect x="50" y="-20" width="50" height="142"/></clipPath>'
    + '<g class="ro-shoeL" clip-path="url(#roClipL)">'+shoes0+'</g>'
    + '<g class="ro-shoeR" clip-path="url(#roClipR)">'+shoes0+'</g>'
    : "";
  const hat = roSlot(s,"hat",override);
  const weapon0 = roSlot(s,"weapon",override);
  const weapon = weapon0 ? '<g class="ro-weapon">'+weapon0+'</g>' : "";   // ⚔️ 武器獨立圖層(攻擊時可揮動)
  const customHair = roSlot(s,"hair",override);
  const eyes = roSlot(s,"eyes",override)
    || '<ellipse cx="43.5" cy="30.5" rx="4" ry="5" fill="#fff"/><ellipse cx="56.5" cy="30.5" rx="4" ry="5" fill="#fff"/>'
     + '<circle cx="43.8" cy="31.2" r="2.6" fill="#3c6bd0"/><circle cx="56.8" cy="31.2" r="2.6" fill="#3c6bd0"/>'
     + '<circle cx="43.8" cy="31.2" r="1.1" fill="#141024"/><circle cx="56.8" cy="31.2" r="1.1" fill="#141024"/>'
     + '<circle cx="42.7" cy="29.6" r="0.95" fill="#fff"/><circle cx="55.7" cy="29.6" r="0.95" fill="#fff"/>'
     + '<path d="M39.4 26.8 Q43.5 24.8 47.6 26.8" stroke="#3a2a22" stroke-width="1.3" fill="none" stroke-linecap="round"/>'
     + '<path d="M52.4 26.8 Q56.5 24.8 60.6 26.8" stroke="#3a2a22" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
  const brows = roSlot(s,"brows",override)
    || '<path d="M39.5 23.2 L46.5 22.2" stroke="#8f3a1f" stroke-width="1.7" stroke-linecap="round"/>'
     + '<path d="M53.5 22.2 L60.5 23.2" stroke="#8f3a1f" stroke-width="1.7" stroke-linecap="round"/>';
  const nose = roSlot(s,"nose",override) || "";
  const outfit = roOutfit(s);
  const basePng = A_base(s);   // 🧍 素體:依性別+職業取(見 A_base)
  if(basePng){
    /* 匯入的基礎體圖已含身體+髮型+臉;此處疊裝備圖層,並依 BASE_FIT 對位參數定位 */
    const hairOnly = roSlot(s,"hair",override) || "";   // 💇 髮型:素體可另疊自製髮型(工坊設計預覽用)
    // 🎯 對位:依 BASE_FIT 的 dx/dy/scale 定位裝備(工坊自製裝備也走同一函式,自動同步)
    const fit = (svgFrag, slot)=>{
      if(!svgFrag) return "";
      const f = BASE_FIT[slot]; if(!f) return svgFrag;
      const sx = f.sx!==undefined ? f.sx : (f.sc||1);
      const sy = f.sy!==undefined ? f.sy : (f.sc||1);
      let cx = 50;   // 縮放/置中的水平基準點
      if(f.center){  // 🪽 置中背飾:量圖形左右邊界(含 width),中心對齊人物中線 50
        let lo = 999, hi = -999, m;
        const reX = /\bx="([0-9.]+)"(?:[^>]*?\bwidth="([0-9.]+)")?/g;
        while((m = reX.exec(svgFrag))){
          const x = parseFloat(m[1]); if(isNaN(x)) continue;
          const w = m[2]?parseFloat(m[2]):0;
          if(x<lo) lo=x; if(x+w>hi) hi=x+w;
        }
        const reC = /\bcx="([0-9.]+)"[^>]*?\br(?:x)?="([0-9.]+)"/g;
        while((m = reC.exec(svgFrag))){
          const c = parseFloat(m[1]), r = parseFloat(m[2]||"0");
          if(c-r<lo) lo=c-r; if(c+r>hi) hi=c+r;
        }
        if(hi>lo) cx = (lo+hi)/2;
      }
      const t = 'translate('+(f.dx+50-cx*sx)+' '+(f.dy+55-55*sy)+') scale('+sx+' '+sy+')';
      return '<g transform="'+t+'">'+svgFrag+'</g>';
    };
    const pants = pants0;   // 👖 褲子(獨立下半身裝備)
    // 依 BASE_FIT.z 圖層順序排序組裝(可透過對位工具調整層級)
    const faceLayer = "";   // 快速染色已烘焙進原比例 PNG，不再疊一層眼睛圖案
    const LG = (slot)=> isLegendSlot(s, slot, override);
    // 註冊時可校正素體相對於裝備層的位置；裝備維持基準座標，讓學生能直接對準紙娃娃。
    const rawTune = (s && s.baseTune) || {};
    const baseTune = {
      x:Math.max(-18,Math.min(18,Number(rawTune.x)||0)),
      y:Math.max(-18,Math.min(18,Number(rawTune.y)||0)),
      s:Math.max(.55,Math.min(1.65,Number(rawTune.s)||1))
    };
    const baseTransform = 'translate('+baseTune.x+' '+baseTune.y+') translate(50 55) scale('+baseTune.s+') translate(-50 -55)';
    const parts = [
      {z:BASE_FIT.back.z,    svg:fit(back,"back"), legend:LG("back")},
      {z:BASE_FIT.base.z,    svg:'<g transform="'+baseTransform+'"><image href="'+A_base(s)+'" x="'+BASE_POS.x+'" y="'+BASE_POS.y+'" width="'+BASE_POS.w+'" height="'+BASE_POS.h+'" preserveAspectRatio="xMidYMax meet"/></g>'},
      {z:BASE_FIT.pants.z,   svg:fit(pants,"pants"), legend:LG("pants")},
      {z:BASE_FIT.shoes.z,   svg:fit(shoes,"shoes"), legend:LG("shoes")},
      {z:BASE_FIT.clothes.z, svg:fit(clothes,"clothes"), legend:LG("clothes")},
      {z:4.5,                svg:hairOnly},
      {z:5,                  svg:faceLayer},
      {z:BASE_FIT.hat.z,     svg:fit(hat,"hat"), legend:LG("hat")},
      {z:BASE_FIT.weapon.z,  svg:fit(weapon,"weapon"), legend:LG("weapon")}
    ];
    parts.sort((a,b)=>a.z-b.z);
    return '<svg viewBox="0 -20 100 122" width="'+size+'" height="'+Math.round(size*1.22)+'" aria-hidden="true" style="overflow:visible">'
      + RO_DEFS + toonDefs()
      + '<ellipse cx="50" cy="92" rx="23" ry="5" fill="rgba(0,0,0,.35)"/>'
      + LEGEND_GLOW_DEFS
      + '<g filter="url(#lgGlow)">'                                   // ✨ 傳說光暈層(在黑描邊群組外,不會被描黑)
      +   parts.filter(p=>p.legend).map(p=>p.svg).join("")
      + '</g>'
      + TOON_OPEN
      + outfit.aura
      + parts.map(p=>p.svg).join("")
      + TOON_CLOSE
      + '</svg>';
  }
  return '<svg viewBox="0 -20 100 122" width="'+size+'" height="'+Math.round(size*1.22)+'" aria-hidden="true" style="overflow:visible">'
    + RO_DEFS + toonDefs()
    + '<ellipse cx="50" cy="92" rx="23" ry="5" fill="rgba(0,0,0,.35)"/>'
    + LEGEND_GLOW_DEFS
    + '<g filter="url(#lgGlow)">'                                     // ✨ 傳說光暈層(黑描邊群組外)
    +   (isLegendSlot(s,"back",override)?back:"") + (isLegendSlot(s,"pants",override)?pants0:"") + (isLegendSlot(s,"shoes",override)?shoes:"")
    +   (isLegendSlot(s,"clothes",override)?clothes:"") + (isLegendSlot(s,"hat",override)?hat:"")
    +   (isLegendSlot(s,"weapon",override)?weapon:"")
    + '</g>'
    + TOON_OPEN
    + outfit.aura
    + back
    + (customHair ? "" : '<path d="M31 26 Q27 6 50 4 Q73 6 69 26 Q72 36 67 43 L63 32 L59 42 L54 31 L50 43 L46 31 L41 42 L37 32 L33 43 Q28 36 31 26 Z" fill="#8f3a1f" stroke="#5e2510" stroke-width="1.2"/>')
    + outfit.lower
    + pants0
    + shoes
    + outfit.torso
    + clothes
    + outfit.arms
    + '<path d="M 31.5 27 A 18.5 18.5 0 0 1 68.5 27 C 68.5 36 61 44 50 47.5 C 39 44 31.5 36 31.5 27 Z" fill="#ffd9b0" stroke="#d9a06e" stroke-width="1.2"/>'
    + outfit.headwear
    + '<ellipse cx="37.5" cy="35.5" rx="2.6" ry="1.5" fill="#ff9c7a" opacity=".5"/><ellipse cx="62.5" cy="35.5" rx="2.6" ry="1.5" fill="#ff9c7a" opacity=".5"/>'
    + brows + eyes + nose
    + '<path d="M46.8 38.6 Q50 41 53.2 38.6" stroke="#a0522d" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
    + (customHair ? customHair :
      '<path d="M31.5 25 Q32.5 8 50 7 Q67.5 8 68.5 25 L64.5 18.5 L62 26 L58 17.5 L55 25.5 L50 16.5 L45 25.5 L42 17.5 L38 26 L35.5 18.5 Z" fill="#c85a32" stroke="#8f3a1f" stroke-width="1.1"/>'
      + '<path d="M39 12.5 Q45 9.5 51 10.5" stroke="#ef8a55" stroke-width="2" fill="none" stroke-linecap="round"/>'
      + '<path d="M55 11.5 Q60 12 63 15" stroke="#ef8a55" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
      + '<path d="M31 23 Q28.5 33 33 41 L36.5 29 Z" fill="#c85a32" stroke="#8f3a1f" stroke-width="1"/>'
      + '<path d="M69 23 Q71.5 33 67 41 L63.5 29 Z" fill="#c85a32" stroke="#8f3a1f" stroke-width="1"/>')
    + hat
    + weapon
    + TOON_CLOSE
    + '</svg>';
}

/* ── B 方案漫畫濾鏡(描邊+鮮豔)──────────────────
 * toonDefs():濾鏡定義(每個 SVG 放一次);toonOpen/toonClose:包裹圖層內容。 */
function toonDefs(){ return ""; }   /* 改用 CSS filter,不需 SVG defs */
/* 四方向 drop-shadow 疊出黑色描邊 + 飽和對比;純 CSS 不靠 id,避免同頁多角色衝突 */

function equippedPetInfo(s){
  const card=s&&s.petCardId&&s.petCards&&s.petCards[s.petCardId];
  if(card&&Number(card.count)>0)return {name:card.name||"地城寵物",emoji:card.icon||"🐾",art:card.art||"",group:card.group||"assist",tier:Number(card.tier)||1,card:true};
  const old=s&&s.petId&&PETS[s.petId];return old?{name:old.name,emoji:old.emoji,tier:4,card:false}:null;
}
function withPetAtFeet(svg,s){
  const p=equippedPetInfo(s);if(!p||!svg)return svg;
  const glow=p.tier>=7?'#ff4df0':p.tier>=5?'#ffd234':'#72d9ff';
  const petImage=p.card?'<image href="'+esc(petArtHref(p))+'" x="7" y="67" width="24" height="24" preserveAspectRatio="xMidYMid meet" style="image-rendering:pixelated"/>':'<text x="19" y="85" text-anchor="middle" font-size="15">'+esc(p.emoji)+'</text>';
  const art='<g class="doll-pet-at-feet" style="filter:drop-shadow(0 1px 1px #141414)" aria-label="'+esc(p.name)+'"><ellipse cx="19" cy="91" rx="11" ry="3" fill="rgba(0,0,0,.32)"/><circle cx="19" cy="80" r="12" fill="rgba(255,255,255,.88)" stroke="'+glow+'" stroke-width="2"/>'+petImage+'</g>';
  return svg.replace(/<\/svg>\s*$/,art+'</svg>');
}
function withDiamondCosmetic(svg,s){
  const c=diamondCosmeticInfo(s&&s.diamondCosmeticId);if(!c||!svg)return svg;
  let art="";
  if(c.id==="star_nameplate")art='<g class="diamond-cosmetic star-nameplate"><ellipse cx="50" cy="94" rx="25" ry="4" fill="'+c.main+'" opacity=".28"/><path d="M25 86l2 4 4 1-4 2-1 4-2-4-4-1 4-2zM74 82l2 4 4 1-4 2-1 4-2-4-4-1 4-2z" fill="'+c.accent+'"/><rect x="36" y="95" width="28" height="5" rx="2.5" fill="'+c.main+'" stroke="'+c.accent+'" stroke-width="1"/></g>';
  else if(c.id==="guardian_cape")art='<g class="diamond-cosmetic guardian-cape"><path d="M35 31Q20 45 25 81L39 72 50 84 61 72 75 81Q80 45 65 31L59 42H41z" fill="'+c.main+'" stroke="#6d1d28" stroke-width="2" opacity=".96"/><path d="M37 38Q50 49 63 38M31 69l8-4 11 12 11-12 8 4" fill="none" stroke="'+c.accent+'" stroke-width="2"/></g>';
  else art='<g class="diamond-cosmetic class-legend-aura"><ellipse cx="50" cy="53" rx="37" ry="43" fill="none" stroke="'+c.main+'" stroke-width="2" stroke-dasharray="4 5" opacity=".65"/><path d="M50 5l3 6 7 1-5 5 2 7-7-4-7 4 2-7-5-5 7-1z" fill="'+c.accent+'"/><circle cx="16" cy="42" r="2" fill="#63e6be"/><circle cx="83" cy="37" r="2.5" fill="#ffe070"/><circle cx="21" cy="71" r="2.5" fill="#ff75b5"/><circle cx="78" cy="76" r="2" fill="#66c9ff"/></g>';
  return svg.replace(/(<ellipse cx="50" cy="9[024]"[^>]*>)/,art+'$1');
}

function dollSVG(s, size, override){
  const fullSet = !override && legendSetInfo(s&&s.legendSetId);
  if(fullSet){
    return withPetAtFeet(withDiamondCosmetic('<svg class="legend-doll legend-'+fullSet.id+'" viewBox="0 -20 100 122" width="'+size+'" height="'+Math.round(size*1.22)+'" aria-hidden="true" style="--legend-main:'+fullSet.main+';--legend-accent:'+fullSet.accent+';overflow:visible">'
      + '<ellipse cx="50" cy="92" rx="25" ry="5" fill="rgba(0,0,0,.32)"/>'
      + legendSetSvgFx(fullSet)
      + '<image class="legend-body" href="'+fullSet.img+'" x="0" y="-24" width="100" height="126" preserveAspectRatio="xMidYMid meet" style="image-rendering:pixelated"/>'
      + '</svg>',s),s);
  }
  if(s.roStyle) return withPetAtFeet(withDiamondCosmetic(dollRO(s, size, override),s),s);
  const bodyC = JOB_BODY_COLOR[s.job] || "#888";
  const back = slotArt(s, "back", override);
  const clothes = slotArt(s, "clothes", override);
  const pants = slotArt(s, "pants", override);
  const shoes = slotArt(s, "shoes", override);
  const customEyes = slotArt(s, "eyes", override);
  const brows = slotArt(s, "brows", override);
  const nose = slotArt(s, "nose", override);
  const hat = slotArt(s, "hat", override);
  const weapon = slotArt(s, "weapon", override);
  const eyes = customEyes
    || '<circle cx="45" cy="37" r="1.8" fill="#3a3128"/><circle cx="55" cy="37" r="1.8" fill="#3a3128"/>';
  return withPetAtFeet(withDiamondCosmetic('<svg viewBox="0 -20 100 122" width="'+size+'" height="'+Math.round(size*1.22)+'" aria-hidden="true">'
    + toonDefs()
    + LEGEND_GLOW_DEFS
    + '<ellipse cx="50" cy="90" rx="24" ry="6" fill="rgba(0,0,0,.35)"/>'
    + '<g filter="url(#lgGlow)">'                                     // ✨ 傳說光暈層(黑描邊群組外)
    +   (isLegendSlot(s,"back",override)?back:"") + (isLegendSlot(s,"pants",override)?pants:"") + (isLegendSlot(s,"shoes",override)?shoes:"")
    +   (isLegendSlot(s,"clothes",override)?clothes:"") + (isLegendSlot(s,"hat",override)?hat:"")
    +   (isLegendSlot(s,"weapon",override)?weapon:"")
    + '</g>'
    + TOON_OPEN
    + back   // 背飾(最底)
    + '<rect x="36" y="50" width="28" height="32" rx="8" fill="'+bodyC+'"/>'          // 身體
    + '<path d="M 35 38 A 15 15 0 0 1 65 38 C 65 45.5 59 51.5 50 54.5 C 41 51.5 35 45.5 35 38 Z" fill="#f0cfa8"/>'                                // 頭
    + pants + clothes + shoes
    + eyes + brows + nose
    + '<path d="M45 43 Q50 46 55 43" stroke="#3a3128" stroke-width="1.4" fill="none"/>'
    + slotArt(s, "hair", override)
    + hat
    + weapon
    + TOON_CLOSE
    + '</svg>',s),s);
}

/* ── 狀態 ─────────────────────────────────────────── */

function newStudent(id, name, job, group){
  return { id, name, job:job||"Warrior", group:group||UNASSIGNED_GROUP,
    registrationComplete:false,                            // 新生完成素體／職業選擇後才改為 true
    jobPending:true,                                       // 名冊暫存不代表已選戰士；最後確認才解除
    roStyle:true,                                          // 全職業 RO 風正式美術(v106 起預設)
    level:1, xp:0, totalXp:0, gold:100, spPoints:0,
    statPoints:0, alloc:{atk:0, agi:0, int:0, def:0},
    maxHp:100, currentHp:100,
    baseAtk:10, baseAgi:10, baseInt:10, baseDef:10,
    hatId:null, clothesId:null, pantsId:null, weaponId:null,
    backId:null, shoesId:null, hairId:null, eyesId:null, browsId:null, noseId:null,
    blueprints:{},
    readDate:null, spinDate:null, spinCount:0,
    gachaPityRare:0, gachaPityLegend:0,                  // 🃏 跨日保底：50 抽稀有、100 抽傳說
    gachaMonth:"", gachaMonthCount:0, gachaMonthLegends:0, // 每月 50/100 抽至少取得 1/2 件傳說
    skills:{}, skillLoadout:[],                            // 🎒 已裝備技能:最多 5 招會在戰場觸發
    diamonds:0, mentorTier:1, realItems:{},                 // 💎 鑽石／指導金幣倍率／現實道具卡
    thanksToday:{date:"", count:0, to:{}}, thanksWall:[], thanksTotal:0, thanksSentTotal:0, thanksNew:0,   // 💌 感謝卡
    leaderReviewStats:{date:"",week:"",count:0,gold:0,gems:0,total:0}, // 🛡️ 同儕代審：每日金幣、每週鑽石與累積數
    goldFlow:{date:"",issued:0,spent:0},                    // 💰 個人每日金幣流量
    pets:{}, petId:null, customJobName:"",                  // 🐉 寵物 / 🌠 自訂職業名
    petCards:{}, petCardId:null, petLegendCrafted:{}, dungeonPetClaims:[], // 🎴 地城寵物卡／裝備／唯一傳說製作
    legendSets:{}, legendSetId:null,                         // 🌏 世界城堡全身傳說套裝收藏／目前穿戴
    diamondCosmetics:{}, diamondCosmeticId:null,             // 💎 階段性純外觀收藏／目前展示
    gender:"male",                                          // 👦👧 角色外型(素體男/女)
    bagItems:[],                                            // 🎒 背包裝備(上限 BAG_MAX,換下的裝備存這裡)
    dailyXp:{date:"", sum:0},                               // 📊 每日常規 EXP 累計(受學年上限管制)
    dungeonStats:{totalQuestions:0,totalCorrect:0,sessions:0,clears:0,lastAt:0,streakDays:0,streakDate:"",daily:{date:"",xp:0,gold:0},volumes:{}}, // 🏰 課後地下城學習成果
    autoPilot:false,                                        // 🤖 角色託管(自動分配能力點/技能/買裝備,不動鑽石)
    consumables:{}, achievements:[] };
}
/* 自訂確認彈窗:取代 window.confirm(部分瀏覽器封鎖對話框會靜默失敗)*/
function modalConfirm(msg, onYes, yesLabel){
  modalHost.innerHTML = '<div class="overlay" id="ovlC"><div class="modal" style="max-width:400px;text-align:center">'
    + '<div style="font-size:15px;font-weight:700;white-space:pre-line;margin-bottom:16px">'+esc(msg)+'</div>'
    + '<div class="inline-form" style="justify-content:center">'
    + '<button class="btn danger" id="mcYes">'+esc(yesLabel||"確定")+'</button>'
    + '<button class="btn" id="mcNo">取消</button>'
    + '</div></div></div>';
  const close = ()=>{ modalHost.innerHTML = ""; };
  document.getElementById("mcNo").onclick = close;
  document.getElementById("ovlC").onclick = (e)=>{ if(e.target.id==="ovlC") close(); };
  document.getElementById("mcYes").onclick = ()=>{ close(); onYes && onYes(); };
}
/* 自訂輸入彈窗(取代 prompt,避免瀏覽器封鎖) */
function modalPrompt(msg, defVal, onOk, maxLen){
  modalHost.innerHTML = '<div class="overlay" id="ovlP"><div class="modal" style="max-width:400px;text-align:center">'
    + '<div style="font-size:15px;font-weight:700;white-space:pre-line;margin-bottom:10px">'+esc(msg)+'</div>'
    + '<input type="text" id="mpVal" maxlength="'+(maxLen||12)+'" value="'+esc(defVal||"")+'" style="width:90%;margin-bottom:12px;text-align:center;font-size:16px">'
    + '<div class="inline-form" style="justify-content:center">'
    + '<button class="btn gold" id="mpOk">確定</button>'
    + '<button class="btn" id="mpNo">取消</button></div></div></div>';
  const close = ()=>{ modalHost.innerHTML=""; };
  document.getElementById("mpNo").onclick = ()=>{ close(); onOk && onOk(null); };
  document.getElementById("ovlP").onclick = (e)=>{ if(e.target.id==="ovlP"){ close(); onOk && onOk(null); } };
  const ok = ()=>{ const v=(document.getElementById("mpVal").value||"").trim(); close(); onOk && onOk(v||null); };
  document.getElementById("mpOk").onclick = ok;
  document.getElementById("mpVal").onkeydown = (e)=>{ if(e.key==="Enter") ok(); };
  setTimeout(()=>{ const el=document.getElementById("mpVal"); if(el) el.focus(); }, 50);
}
function freshState(){
  const st = {
    dataProfile:"production",
    groups:["A"],
    students:[],
    log:[],
    classGoal:{target:2000, progress:0, celebrated:false},
    nextIdNum:1,
    tasks:[], submissions:[], taskReviewLog:[], helpRequests:[], nextTaskId:1, boss:null,
    customItems:[], nextItemId:1000,
    rewardCards:[],                                      // 🎁 教師一次性獎勵卡
    lesson:{active:false,title:"",prompt:"",xp:15,gold:3,answered:{},startedAt:0}, // 📣 即時知識挑戰
    teacherQuestions:[],                                 // 📚 教師匯入的自訂題庫
    announcements:[], nextAnnId:1, announcementSchedules:[], nextAnnScheduleId:1, goldBurned:0,
    care:{week:"",points:0,unique:{}},                    // 💌 班級關懷值，不作個人人氣排行
    economy:{goldPerDiamond:1000,dailyGoldCap:500,dungeonDailyGoldCap:20,peerReviewGold:20,peerReviewDiamondEvery:20,peerReviewWeeklyDiamondCap:1,rewardDiamondWeeklyCap:3,learningDiamondWeeklyCap:2,totalDiamondWeeklyCap:6,goldIssued:0,goldSpent:0},
    art:{}, skillsOff:false,
    classSession:{active:false,startedAt:0,endedAt:0,expiresAt:0,token:""}, // 🔐 每節課獨立 QR 通行證
    dailyCapOn:true,                                       // 📊 每日常規 EXP 上限開關
    unlockedMaps:[],                                       // 🗺 已解鎖戰場(擊敗對應屬性魔王取得)
    classUnlocks:{enabled:true,manualStage:0,scale:1,celebrated:[],teacherGates:{social:false,review:false,pvp:false,guild:false,moba:false,world:false}}, // 🏫 XP＋教師安全確認
  };
  return st;
}
/* 正式新班級必須是乾淨名冊，學生只由教師匯入或核准註冊後建立。 */
function emptyClassState(){
  const st=freshState();
  st.allowSelfEnroll=false;                              // 正式班級只允許教師匯入名冊後認領，避免偽造角色
  return backfill(st);
}
function migrateV1(v1){
  const st = freshState(); st.students = [];
  const groups = new Set();
  for(const o of v1.students){
    const s = newStudent(o.id, o.name, o.job, o.group || "A");
    Object.assign(s, {
      level:o.level, xp:o.xp, gold:o.gold, spPoints:o.spPoints||0,
      maxHp:o.maxHp||100, currentHp:o.currentHp||100,
      baseAtk:o.baseAtk, baseAgi:o.baseAgi, baseInt:o.baseInt, baseDef:o.baseDef,
      hatId:o.hatId||null, clothesId:o.clothesId||null, weaponId:o.weaponId||null,
      consumables:o.consumables||{},
    });
    groups.add(s.group);
    st.students.push(s);
  }
  if(groups.size) st.groups = [...groups].sort();
  st.log = v1.log || [];
  return st;
}
/* 正式版一次性清理：只刪除舊版內建的精確測試角色，不碰名稱或學號相近的正式學生。 */
function removeLegacyTestData(p){
  const exact=new Map([
    ["T01","測試戰士"],["T02","測試法師"],["T03","測試遊俠"],
    ["T04","測試牧師"],["T05","測試富翁"],["T06","測試新手"]
  ]),removed=new Set();
  p.students=Array.isArray(p.students)?p.students.filter(s=>{
    const id=String(s&&s.id||""),name=String(s&&s.name||""),sno=String(s&&s.sno||"");
    const isBuiltIn=exact.get(id)===name || (/^DM[A-Z]\d+$/i.test(id)&&/^示範學生\d+$/.test(name)&&/^DEMO\d+$/.test(sno));
    if(isBuiltIn)removed.add(id);
    return !isBuiltIn;
  }):[];
  if(removed.size){
    ["submissions","awardLog","taskReviewLog","log","renameReq"].forEach(k=>{
      if(Array.isArray(p[k]))p[k]=p[k].filter(x=>!removed.has(String((x&&x.sid)||""))&&!removed.has(String((x&&x.leaderId)||"")));
    });
    if(p.groupLeaders&&typeof p.groupLeaders==="object")Object.keys(p.groupLeaders).forEach(g=>{if(removed.has(String(p.groupLeaders[g])))delete p.groupLeaders[g];});
    p.students.forEach(s=>{if(s.thanksToday&&s.thanksToday.to)removed.forEach(id=>delete s.thanksToday.to[id]);if(Array.isArray(s.thanksWall))s.thanksWall=s.thanksWall.filter(x=>!removed.has(String((x&&x.sid)||"")));});
  }
  p.dataProfile="production";
  p.allowSelfEnroll=false;
  if(p.siege&&typeof p.siege==="object")p.siege.testMode=false;
  ["_richGift","_petGiftV1","_legendGiftV3","_skillTest90Ready","_arenaTestFiveReadyV3"].forEach(k=>delete p[k]);
  return p;
}
function backfill(p){
  removeLegacyTestData(p);
  p.groups=Array.isArray(p.groups)?p.groups.map(x=>String(x||"").trim()).filter(Boolean):["A"];
  p.students=Array.isArray(p.students)?p.students:[];
  /* 學生只會下載去識別化 public/main，學習日誌刻意不會公開。
   * 因此學生端必須把缺少的 log 視為空陣列，不能讓首頁渲染失敗。 */
  p.log=Array.isArray(p.log)?p.log:[];
  p.teacherQuestions = Array.isArray(p.teacherQuestions) ? p.teacherQuestions : [];
  p.tasks = Array.isArray(p.tasks) ? p.tasks : [];
  p.submissions = Array.isArray(p.submissions) ? p.submissions : [];
  p.taskReviewLog = Array.isArray(p.taskReviewLog) ? p.taskReviewLog : [];
  p.helpRequests = Array.isArray(p.helpRequests) ? p.helpRequests : [];
  p.tasks.forEach(t=>{
    if(!["teacher","auto","leader"].includes(t.reviewMode)) t.reviewMode="teacher";
    if(t.dungeonHomework) t.reviewMode="teacher";
    if(t.leaderDelayHours===undefined) t.leaderDelayHours=24;
    if(!t.autoRule) t.autoRule="level";
    if(t.autoTarget===undefined) t.autoTarget=1;
  });
  p.submissions.forEach(x=>{
    if(!x.submittedAt){ const ms=Date.parse(x.t||""); x.submittedAt=Number.isFinite(ms)?ms:Date.now(); }
  });
  p.nextTaskId = p.nextTaskId || 1;
  if(p.dailyCapOn===undefined) p.dailyCapOn = true;
  if(!Array.isArray(p.unlockedMaps)) p.unlockedMaps = [];
  if(!p.classSession || typeof p.classSession!=="object") p.classSession={active:false,startedAt:0,endedAt:0,expiresAt:0,token:""};
  p.classSession.active=!!p.classSession.active;
  p.classSession.startedAt=Number(p.classSession.startedAt)||0;
  p.classSession.endedAt=Number(p.classSession.endedAt)||0;
  p.classSession.expiresAt=Number(p.classSession.expiresAt)||0;
  p.classSession.token=String(p.classSession.token||"");
  if(!p.classUnlocks || typeof p.classUnlocks!=="object") p.classUnlocks={enabled:true,manualStage:0,scale:1,celebrated:[],teacherGates:{}};
  if(p.classUnlocks.enabled===undefined) p.classUnlocks.enabled=true;
  p.classUnlocks.manualStage=Math.max(0,Math.min(12,Number(p.classUnlocks.manualStage)||0));
  p.classUnlocks.scale=Math.max(.25,Math.min(3,Number(p.classUnlocks.scale)||1));
  if(!Array.isArray(p.classUnlocks.celebrated)) p.classUnlocks.celebrated=[];
  p.classUnlocks.teacherGates=Object.assign({social:false,review:false,pvp:false,guild:false,moba:false,world:false},p.classUnlocks.teacherGates||{});
  p.boss = p.boss || null;
  p.customItems = Array.isArray(p.customItems) ? p.customItems.filter(c=>EQUIP_SLOTS.includes(c.type)) : [];
  /* 舊存檔補正：學生創作也套用目前的物品等級與估價底限。 */
  p.customItems.forEach(c=>{
    if(!ALL_SLOTS.includes(c.type)) return;
    c.itemLevel = itemLevelOf(c);
    if(c.price>0 || c.status==="approved" || c.status==="pending")
      c.price = Math.max(Number(c.price)||0, equipmentPriceFloor(c));
  });
  p.rewardCards = Array.isArray(p.rewardCards) ? p.rewardCards : [];
  if(!p.lesson) p.lesson = {active:false,title:"",prompt:"",xp:15,gold:3,answered:{},startedAt:0};
  p.nextItemId = p.nextItemId || 1000;
  p.announcements = Array.isArray(p.announcements) ? p.announcements : [];
  if(!p.care||typeof p.care!=="object")p.care={week:"",points:0,unique:{}};
  if(!p.care.unique||typeof p.care.unique!=="object")p.care.unique={};
  p.nextAnnId = p.nextAnnId || 1;
  p.announcementSchedules = Array.isArray(p.announcementSchedules) ? p.announcementSchedules : [];
  p.nextAnnScheduleId = p.nextAnnScheduleId || 1;
  p.goldBurned = p.goldBurned || 0;
  p.economy=Object.assign({goldPerDiamond:1000,dailyGoldCap:500,dungeonDailyGoldCap:20,peerReviewGold:20,peerReviewDiamondEvery:20,peerReviewWeeklyDiamondCap:1,rewardDiamondWeeklyCap:3,learningDiamondWeeklyCap:2,totalDiamondWeeklyCap:6,goldIssued:0,goldSpent:0},p.economy||{});
  p.economy.goldPerDiamond=1000; // 固定匯率，只作價值尺度，不開放學生自由兌換
  p.art = p.art || {};
  if(p.skillsOff===undefined) p.skillsOff = false;
  if(!p.teacherEmails) p.teacherEmails = [];
  if(p.lbOptIn===undefined) p.lbOptIn = false;
  if(p.lbName===undefined) p.lbName = "";
  if(p.className===undefined) p.className = "";
  if(p.bossKills===undefined) p.bossKills = 0;
  if(!p.xpWeek) p.xpWeek = {key:"", sum:0};
  if(!p.customTitleDefs) p.customTitleDefs = [];       // 教師自訂稱號(名稱+效果)
  if(p.weeklyFeaturedDesignId===undefined) p.weeklyFeaturedDesignId = null; // 🎨 本週設計師精選
  if(!p.awardPresets) p.awardPresets = [               // 自訂快捷加分鈕
    {name:"課堂表現", xp:10, gold:0},
    {name:"作業繳交", xp:30, gold:0},
    {name:"小組合作", xp:0,  gold:20},
    {name:"考試進步", xp:50, gold:30}
  ];
  if(!p.awardLog) p.awardLog = [];                     // 加分紀錄(供撤銷)
  if(!p.termInfo) p.termInfo = { startDate:"", target:500, minScore:60, maxScore:100 };   // 平時成績結算設定
  if(!p.progression) p.progression = { date:"", stage:0, exploreXp:0, exploreGoal:300 };   // 每日閘門:0探索→1魔王→2競技場
  if(!p.groupLeaders) p.groupLeaders = {};             // 各組組長 {組名: 學生id}
  if(!p.siege) p.siege = { forceDate:"", entries:[] };  // 公會戰:強制開啟日/已報名組
  p.siege.testMode = false;
  if(!p.siege.tournament) p.siege.tournament = null;   // 🏆 積分循環賽 {teams,matches,scores}
  if(!p.castle) p.castle = { owner:"", since:"", taxDate:"" };   // 🏰 榮耀之城:城主組/佔領日/稅收發放日
  p.students.forEach((s,i)=>{
    if(!s.group)s.group=UNASSIGNED_GROUP;
    if(!p.groups.includes(s.group))p.groups.push(s.group);
    if(s.seat===undefined) s.seat = String(i+1);      // 座號預設依名冊順序
    if(s.sno===undefined) s.sno = "";                  // 學號(唯一,家長查看用)
    if(!s.customTitles) s.customTitles = [];           // 教師頒發稱號
    if(s.title===undefined) s.title = "";              // 顯示中的稱號(空=不顯示)
    if(s.email===undefined) s.email = "";
    if(s.birth===undefined) s.birth = "";
    if(!s.thanksToday) s.thanksToday = { date:"", count:0, to:{} };   // 💌 感謝卡:今日送出紀錄
    if(!s.thanksWall) s.thanksWall = [];                              // 收到的感謝(最近30則)
    if(s.thanksTotal===undefined) s.thanksTotal = 0;
    if(s.thanksSentTotal===undefined) s.thanksSentTotal = 0;
    if(s.thanksNew===undefined) s.thanksNew = 0;
    if(!s.thanksRecent||typeof s.thanksRecent!=="object")s.thanksRecent={};
    if(!s.diamondFlow||typeof s.diamondFlow!=="object")s.diamondFlow={week:"",reward:0,learning:0,review:0,total:0};
    if(!s.leaderReviewStats) s.leaderReviewStats = {date:"",week:"",count:0,gold:0,gems:0,total:0}; // 🛡️ 同儕代審統計
    if(!s.goldFlow)s.goldFlow={date:"",issued:0,spent:0};
    if(!s.learningStreak) s.learningStreak = {date:"", days:0, total:0}; // 回答問題的學習連勝
    if(s.lessonAnswers===undefined) s.lessonAnswers = 0;
    if(!s.dungeonStats||typeof s.dungeonStats!=="object")s.dungeonStats={totalQuestions:0,totalCorrect:0,sessions:0,clears:0,lastAt:0,streakDays:0,streakDate:"",daily:{date:"",xp:0,gold:0},volumes:{}};
    if(!s.dungeonStats.daily)s.dungeonStats.daily={date:"",xp:0,gold:0};if(!s.dungeonStats.volumes)s.dungeonStats.volumes={};
    if(!s.pets) s.pets = {};                                  // 🐉 已獲得寵物 {petId:true}
    if(!s.petCards||typeof s.petCards!=="object")s.petCards={};
    if(s.petCardId===undefined)s.petCardId=null;
    if(!s.petLegendCrafted||typeof s.petLegendCrafted!=="object")s.petLegendCrafted={};
    if(s.petMaterials)delete s.petMaterials; // 舊測試版素材制已移除，卡片改為直接製作裝備／道具
    if(!Array.isArray(s.dungeonPetClaims))s.dungeonPetClaims=[];
    if(!s._commonSkillRefunded && s.skills){                   // v124:移除共用技能→退還已投SP一次
      let back = (s.skills.wealth||0) + (s.skills.study||0) + (s.skills.tough||0);
      if(back>0){ s.spPoints = (s.spPoints||0) + back; delete s.skills.wealth; delete s.skills.study; delete s.skills.tough; }
      s._commonSkillRefunded = true;
    }
    if(s.petId===undefined) s.petId = null;                   // 裝備中寵物
    if(s.customJobName===undefined) s.customJobName = "";     // 🌠 流星卡自訂職業名
    if(s.roStyle===undefined && RO_TIER[s.job]) s.roStyle = true;   // v106:全職業套用 RO 風正式美術
  });
  if(p.boss){                                // 相容:進行中的 Boss 補上 v30 新欄位
    if(!p.boss.standby) p.boss.standby = {};
    if(!p.boss.groupBuffs) p.boss.groupBuffs = {};
    if(p.boss.atkBonus===undefined) p.boss.atkBonus = 0;
    if(p.boss.casting===undefined) p.boss.casting = false;
    if(p.boss.counterHalf===undefined) p.boss.counterHalf = false;
    if(p.boss.frozen===undefined) p.boss.frozen = false;
    if(p.boss.poison===undefined) p.boss.poison = null;
    if(!p.boss.revivedThisFight) p.boss.revivedThisFight = {};
  }
  delete p.allowJobPick;                                  // 初次註冊必須自選；完成後只能用轉職卡變更
  p.allowSelfEnroll = false;                               // 正式班級只允許教師名冊認領
  if(p.backupReminder===undefined) p.backupReminder = true;    // 每週備份提醒開關
  if(typeof p.nextIdNum !== "number" || isNaN(p.nextIdNum)){    // 保險:從現有ID推算下一個號
    let mx = 0; (p.students||[]).forEach(st=>{ const n = parseInt(String(st.id||"").replace(/\D/g,"")); if(!isNaN(n) && n>mx) mx=n; });
    p.nextIdNum = mx + 1;
  }
  if(!p.castleShopItems) p.castleShopItems = [       // 🏰 城堡商店(現實道具卡,教師可自訂)
    {key:"pardon", icon:"🎖️", name:"免死金牌", desc:"抵銷一次犯錯機會(使用後由老師審查執行)", price:15},
    {key:"seat",   icon:"🔀", name:"換位卡",   desc:"本次上課可自由換位置", price:8},
    {key:"snack",  icon:"🍿", name:"吃播卡",   desc:"小組本次上課可以吃東西", price:12}
  ];
  if(!p.realItemLog) p.realItemLog = [];               // 道具卡使用紀錄(老師審查)
  if(!p.battleReplays) p.battleReplays = [];           // 📼 戰鬥回放(精華錄影,最多保留 6 場)
  if(!p.renameReq) p.renameReq = [];                   // 📝 改名申請(老師審核)
  if(!p.art) p.art = {};                               // 🎨 匯入美術圖庫
  if(!p.baseTunePresets || typeof p.baseTunePresets!=="object") p.baseTunePresets = {};
  Object.keys(BASE_VARIANTS).forEach(k=>{
    const v=p.baseTunePresets[k]||{};
    p.baseTunePresets[k]={x:Math.max(-18,Math.min(18,Number(v.x)||0)),y:Math.max(-18,Math.min(18,Number(v.y)||0)),s:Math.max(.55,Math.min(1.65,Number(v.s)||1))};
  });
  // 刺蝟頭保留為內部裝備對位基準，教師仍可在美術管理中校正它本身的位置與大小。
  if(!p.art["base:male"]){                             // 🧍 男生素體(Q版大頭,通用所有職業)
    p.art["base:male"] = CLASSROOM_BUILTIN_ART.baseMale;
  }
  if(!p.art["base:female"]){                           // 🧍 女生素體(Q版大頭長髮,通用所有職業)
    p.art["base:female"] = CLASSROOM_BUILTIN_ART.baseFemale;
  }
  if(!p.worldPeak) p.worldPeak = {                     // 🌏 巔峰之城(離線=本機模擬;雲端由 world/peak 同步)
    owner: { cid:"", className:"傳說傭兵團", group:"NPC", leaderName:"傭兵團長", memberNames:["團長","狂戰","冰法","星術","影刺","聖女"] },
    since: "", defenders: null                          // defenders: 守軍快照(佔領時上傳),null=用內建NPC
  };
  if(p.worldPeak.owner && p.worldPeak.owner.group==="NPC"){
    p.worldPeak.owner.memberNames=["團長","狂戰","冰法","星術","影刺","聖女"];
    p.worldPeak.defenders=null;                         // 舊版單武器快照改回新版傳說套裝守軍
  }
  p.students.forEach(s=>{
    if(s.diamonds===undefined) s.diamonds = 0;         // 💎 受每週來源上限管制的高價值貨幣
    if(s.mentorTier===undefined) s.mentorTier = 1;     // 指導金幣倍率(1標準/2加倍/3三倍)
    if(!s.realItems) s.realItems = {};                 // 持有的現實道具卡
    if(!s.consumables) s.consumables = {};             // 舊資料補欄(公會戰攻城卷等)
    if(!s.legendSets || typeof s.legendSets!=="object") s.legendSets = {};
    if(s.legendSetId===undefined) s.legendSetId = null;
    if(s.legendSetId && (!legendSetInfo(s.legendSetId) || !s.legendSets[s.legendSetId])) s.legendSetId = null;
    if(!s.diamondCosmetics || typeof s.diamondCosmetics!=="object") s.diamondCosmetics = {};
    if(s.diamondCosmeticId===undefined) s.diamondCosmeticId = null;
    if(s.diamondCosmeticId && (!diamondCosmeticInfo(s.diamondCosmeticId) || !s.diamondCosmetics[s.diamondCosmeticId])) s.diamondCosmeticId = null;
    if(!s.blueprints) s.blueprints = {};
    if(!s.achievements) s.achievements = [];
    if(s.termStartXp===undefined) s.termStartXp = 0;   // 計分週期起始XP快照
    if(s.statPoints===undefined) s.statPoints = 0;     // 可分配能力點
    if(!s.alloc) s.alloc = {atk:0, agi:0, int:0, def:0};   // 已自點分配
    if(!s.skills) s.skills = {};
    if(!s.blueprints) s.blueprints = {};
    for(const k of Object.keys(s.blueprints)){          /* v23 以前:純部位鍵 → 遷移為普通級 */
      if(!k.includes(":")){ s.blueprints[k+":common"] = (s.blueprints[k+":common"]||0) + s.blueprints[k]; delete s.blueprints[k]; }
    }
    for(const slot of ALL_SLOTS){ if(s[slot+"Id"]===undefined) s[slot+"Id"] = null; }
    if(s.spinCount===undefined){ s.spinCount = 0; s.spinDate = null; s.readDate = null; }
    if(s.gachaPityRare===undefined) s.gachaPityRare = 0;
    if(s.gachaPityLegend===undefined) s.gachaPityLegend = 0;
    if(s.gachaMonth===undefined) s.gachaMonth = "";
    if(s.gachaMonthCount===undefined) s.gachaMonthCount = 0;
    if(s.gachaMonthLegends===undefined) s.gachaMonthLegends = 0;
    /* 素體／髮型設計已自工坊移除：載入舊存檔時一併清除兩類圖紙。 */
    Object.keys(s.blueprints).filter(k=>["hair","base"].includes(k.split(":")[0])).forEach(k=>delete s.blueprints[k]);
    s.hairGift = true;
    if(!s.pantsGift){ s.pantsGift = true; s.blueprints["pants:common"] = (s.blueprints["pants:common"]||0) + 1; }   // 👖 褲子圖紙見面禮×1
    if(!Array.isArray(s.bagItems)) s.bagItems = [];        // 🎒 背包裝備欄位
    if(!s.dailyXp || typeof s.dailyXp!=="object") s.dailyXp = {date:"", sum:0};   // 📊 每日 EXP 累計
    if(s.autoPilot===undefined) s.autoPilot = false;       // 🤖 託管開關
    s.baseGift = true;
  });
  return p;
}
let state = load();
function load(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){ const p = JSON.parse(raw); if(p && Array.isArray(p.students)) return backfill(p); }
    const old = localStorage.getItem(OLD_KEY);
    if(old){ const p = JSON.parse(old); if(p && Array.isArray(p.students)){ const m = backfill(migrateV1(p)); localStorage.setItem(LS_KEY, JSON.stringify(m)); return m; } }
  }catch(e){ /* 壞資料 → 重建 */ }
  const s = backfill(freshState()); localStorage.setItem(LS_KEY, JSON.stringify(s)); return s;
}
function save(){
  try{
    localStorage.setItem(LS_KEY, JSON.stringify(state));  // 本機永遠留一份(離線保險)
  }catch(e){
    // 💾 本機儲存空間滿(常見於工坊圖片作品過多):不讓錯誤炸斷操作,明確告知處理方式
    if(!save._warned){
      save._warned = true;
      toast("⚠️ 本機儲存空間已滿!資料仍在畫面與雲端,但本機備份失敗。請:①匯出備份 ②刪除工坊中過大的圖片作品", true);
      setTimeout(()=>{ save._warned = false; }, 30000);   // 30秒內不重複轟炸
    }
  }
  CLOUD.scheduleSync();                                   // 雲端節流同步(未連線時自動略過)
}
async function sha256Hex(text){
  if(!(window.crypto&&crypto.subtle))throw new Error("此瀏覽器不支援安全查詢");
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(text||"")));
  return Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,"0")).join("");
}
function parentLearningMajor(msg){
  const m=String(msg||"");
  if(/商店|購買|出售|裝備|圖紙|抽卡|轉盤|戰鬥|競技場|公會戰|Boss|傷害|攻擊|倒下|嘲諷|佔領|技能|寵物|城堡|攻城|MVP/.test(m))return false;
  return /回答知識挑戰|課堂回答|完成任務|任務「.*」通過|課堂表現|課堂參與|主動發表|專心投入|勇敢回答|小組合作|協助同學|幫助同學|作業|訂正|考試|測驗|成績|進步|閱讀|報告|解題|學習成果|學習連勝|地下城|自主複習|課後複習|老師獎勵|老師回饋|教師回饋|作品「.*」通過審核|設計作品「.*」上架/.test(m);
}
function groupParentLearningLogs(logs,masker){
  const groups=new Map();
  (logs||[]).forEach((l,index)=>{
    const msg=String(masker?masker(l.msg):l.msg||"");
    /* 獎勵數字、題數與連擊會變動，但仍屬同一種學習事件。保留任務標題，避免不同作業被誤合併。 */
    const key=msg.replace(/[0-9０-９]+(?:\.[0-9０-９]+)?/g,"#").replace(/\s+/g," ").trim();
    let g=groups.get(key);if(!g){g={msg,count:0,latest:l.t||"",times:[],index};groups.set(key,g);}
    g.count++;if(l.t&&!g.times.includes(l.t)&&g.times.length<3)g.times.push(l.t);
  });
  return Array.from(groups.values()).sort((a,b)=>a.index-b.index);
}

/* ══ CLOUD:Firestore 雲端資料層(階段2) ══════════════
 * 結構:classes/{cid}/data/main(班級主體,不含學生與作品)
 *       classes/{cid}/students/{sid}(每生一文件,縮小衝突面)
 *       classes/{cid}/items/{itemId}(工坊作品,含圖片)
 *       leaderboard/{cid}(世界排行榜公開摘要)
 * 同步:save() 後節流 1.5s;dirty-check 只寫有變動的文件。 */

/* ══ 🏰 課後複習地下城：角色帶入、結算回傳與每日獎勵上限 ══ */

const dungeonClaims=new Set();
function dungeonStatsOf(s){
  const d=s.dungeonStats||(s.dungeonStats={});
  d.totalQuestions=Number(d.totalQuestions)||0;d.totalCorrect=Number(d.totalCorrect)||0;d.sessions=Number(d.sessions)||0;d.clears=Number(d.clears)||0;d.lastAt=Number(d.lastAt)||0;d.streakDays=Number(d.streakDays)||0;d.streakDate=String(d.streakDate||"");d.bestAccuracy=Number(d.bestAccuracy)||0;d.bestChain=Number(d.bestChain)||0;
  d.daily=d.daily||{};if(d.daily.date!==todayStr())d.daily={date:todayStr(),xp:0,gold:0};d.daily.xp=Number(d.daily.xp)||0;d.daily.gold=Number(d.daily.gold)||0;d.volumes=d.volumes||{};return d;
}
function dungeonRewardPreview(report,stats){
  const q=Math.max(0,Math.min(100,Math.floor(Number(report.questions)||0))),ok=Math.max(0,Math.min(q,Math.floor(Number(report.correct)||0))),clears=Math.max(0,Math.min(3,Math.floor(Number(report.zoneClears)||0))),accuracy=q?ok/q*100:0;
  const cfg=economyCfg(),dungeonCap=Math.max(0,Number(cfg.dungeonDailyGoldCap)||0);
  const rawXp=Math.min(25,ok*2+(q>=10&&accuracy>=80?5:0)+clears*5),rawGold=Math.min(12,Math.floor(ok/2)+clears*3),daily=stats.daily||{};
  return {questions:q,correct:ok,clears,accuracy,xp:Math.max(0,Math.min(rawXp,40-(Number(daily.xp)||0))),gold:Math.max(0,Math.min(rawGold,dungeonCap-(Number(daily.gold)||0)))};
}
function dungeonApplyLocal(s,report){
  const d=dungeonStatsOf(s),r=dungeonRewardPreview(report,d);r.gold=creditGold(s,r.gold,"地下城自主複習",true);d.totalQuestions+=r.questions;d.totalCorrect+=r.correct;d.sessions++;d.clears+=r.clears;d.lastAt=Date.now();d.bestAccuracy=Math.max(d.bestAccuracy,Math.round(r.accuracy));d.bestChain=Math.max(d.bestChain,Math.max(0,Number(report.bestChain)||0));
  const day=todayStr(),prev=new Date(Date.now()-86400000).toLocaleDateString("sv-SE"),newLearningDay=d.streakDate!==day;if(newLearningDay){d.streakDays=d.streakDate===prev?d.streakDays+1:1;d.streakDate=day;}d.daily.xp+=r.xp;d.daily.gold+=r.gold;
  const learningDiamonds=newLearningDay&&[3,7,14,21,28].includes(d.streakDays)?creditDiamonds(s,1,"learning"):0;
  const vol=String(report.volume||"自選");d.volumes[vol]=d.volumes[vol]||{questions:0,correct:0,clears:0};d.volumes[vol].questions+=r.questions;d.volumes[vol].correct+=r.correct;d.volumes[vol].clears+=r.clears;
  let petCount=0;const transferId=String(report.petTransferId||"").slice(0,120);s.dungeonPetClaims=Array.isArray(s.dungeonPetClaims)?s.dungeonPetClaims:[];
  if(transferId&&!s.dungeonPetClaims.includes(transferId)&&Array.isArray(report.petCards)){
    report.petCards.slice(0,5).forEach(c=>{if(c&&/^[a-z0-9_:-]{1,60}$/i.test(String(c.kind||""))&&petAddCard(s,c,1))petCount++;});
    s.dungeonPetClaims.push(transferId);s.dungeonPetClaims=s.dungeonPetClaims.slice(-60);
  }
  applyLevelUps(s,r.xp);return {reward:{xp:r.xp,gold:r.gold,petCards:petCount,learningDiamonds},stats:d,student:s};
}
async function dungeonAvatarData(s){
  try{
    let svg=dollSVG(s,180).replace(/(?:href|xlink:href)="assets\//g,m=>m.replace("assets/",new URL("assets/",location.href).href));
    if(!/^<svg/i.test(svg.trim()))return "";const blob=new Blob([svg],{type:"image/svg+xml"}),url=URL.createObjectURL(blob),img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});const c=document.createElement("canvas");c.width=240;c.height=292;const x=c.getContext("2d");x.imageSmoothingEnabled=false;x.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);return c.toDataURL("image/webp",.9);
  }catch(e){console.warn("dungeon avatar",e);return "";}
}
async function dungeonEquipmentIconData(s,slot){
  try{
    let frag=roSlot(s,slot);if(!frag)return "";
    frag=frag.replace(/(?:href|xlink:href)="assets\//g,m=>m.replace("assets/",new URL("assets/",location.href).href));
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -8 124 138">'+frag+'</svg>',url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"})),img=new Image();
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("icon timeout")),1800);img.onload=()=>{clearTimeout(timer);resolve();};img.onerror=e=>{clearTimeout(timer);reject(e);};img.src=url;});
    const c=document.createElement("canvas");c.width=c.height=160;const x=c.getContext("2d");x.imageSmoothingEnabled=false;x.drawImage(img,0,0,160,160);URL.revokeObjectURL(url);return c.toDataURL("image/webp",.86);
  }catch(e){console.warn("dungeon equipment icon",slot,e);return "";}
}
async function dungeonEquipmentCards(s){
  const cards=await Promise.all(EQUIP_SLOTS.map(async slot=>{
    const it=itemById(s[slot+"Id"]);if(!it)return null;
    const level=itemLevelOf(it),cost=Math.max(0,Math.min(4,Math.floor(level/20)));
    return {id:String(it.id),slot,name:String(it.name||TYPE_NAME[slot]),rarity:String(it.rarity||"Common"),tier:String(it.tier||""),level,cost,
      atk:Math.max(0,Number(it.atk)||0),def:Math.max(0,Number(it.def)||0),agi:Math.max(0,Number(it.agi)||0),int:Math.max(0,Number(it.int)||0),
      affix:String(it.affix||""),weaponSkill:String(it.weaponSkill||""),weaponPattern:String(it.weaponPattern||""),iconData:await dungeonEquipmentIconData(s,slot)};
  }));
  return cards.filter(Boolean);
}
function dungeonTaskBank(t){return Array.isArray(t&&t.dungeonBank)?t.dungeonBank.slice(0,160):[];}
function dungeonGradeOf(s){const lv=Math.max(1,Number(s&&s.level)||1);return lv<=30?{name:"七年級",maxVolume:2}:lv<=60?{name:"八年級",maxVolume:4}:{name:"九年級",maxVolume:6};}
function dungeonTaskBankForStudent(t,s){const g=dungeonGradeOf(s);return dungeonTaskBank(t).filter(q=>(!q.grade||q.grade===g.name)&&(!Number(q.vol)||Number(q.vol)<=g.maxVolume));}
async function launchDungeon(s,task){
  if(classSessionIsLive(state.classSession)){toast("🔒 老師已開始上課，地下城複習任務已暫停。請回到課堂頁面。",true);return;}
  const win=window.open("about:blank","classRpgMathDungeon");if(!win){toast("瀏覽器阻擋了地下城視窗，請允許彈出式視窗",true);return;}
  try{
    const grade=dungeonGradeOf(s),stats=totalStats(s),sessionId=(crypto.randomUUID?crypto.randomUUID():Date.now()+"_"+Math.random().toString(36).slice(2)),volume=String((task&&task.dungeonVolume)||document.getElementById("dungeonVolume")?.value||"1");if(Number(volume)>grade.maxVolume)throw new Error(grade.name+"目前只開放第 1～"+grade.maxVolume+" 冊");
    const avatarData=await dungeonAvatarData(s),equipmentCards=await dungeonEquipmentCards(s),weapon=itemById(s.weaponId),dungeonJob=({Warrior:"geo",Mage:"alg",Rogue:"stat",Cleric:"num"})[s.job]||"geo";
    const payload={type:"class_rpg_launch",version:6,sessionId,issuedAt:Date.now(),cid:String(CLOUD.cid||"offline"),sid:String(s.id),preClassHomework:true,closeWhenClassStarts:true,volume,studentGrade:grade.name,maxVolume:grade.maxVolume,assignment:task?{id:task.id,title:task.title,target:Number(task.autoTarget)||0,volume,reviewMode:"teacher"}:null,questionBank:dungeonTaskBankForStudent(task,s),character:{name:s.name,classJob:(JOB_INFO[s.job]||{}).name||s.job,classLevel:s.level,studentGrade:grade.name,dungeonJob,title:s.title||"",weapon:{name:weapon?weapon.name:"新手武器",rarity:weapon?weapon.rarity:"Common",type:weapon?weapon.type:"weapon"},equipmentCards,stats:{hp:Math.min(180,105+s.level+Math.round(stats.def*.25)),mana:Math.min(10,5+Math.round(stats.int/45)),hand:Math.min(7,5+Math.floor(stats.agi/80)),dmg:Math.min(1.5,1+stats.atk/500),armor:Math.min(12,Math.round(stats.def/18))},abilities:normalizeSkillLoadout(s).map(id=>{const d=skillDef(s.job,id);return d?d.name:"";}).filter(Boolean),avatarData}};
    localStorage.setItem(DUNGEON_LAUNCH_KEY,JSON.stringify(payload));win.location.href=DUNGEON_URL+"?classroom=1&session="+encodeURIComponent(sessionId);
  }catch(e){win.close();toast("地下城啟動失敗："+(e.message||e),true);}
}
async function dungeonQueueTaskReview(s,report){
  const taskId=Number(report.assignmentId)||0,t=taskById(taskId);if(!taskId||!t||!t.dungeonHomework||!tasksForStudent(s).some(x=>Number(x.id)===taskId))return null;
  const progress=taskAutoStatus(t,s),old=subFor(taskId,s.id);if(!progress.passed||old&&old.status!=="rejected")return old||null;
  const stamp=Date.now(),sub=old||{taskId,sid:s.id};Object.assign(sub,{status:"pending",tier:0,t:new Date(stamp).toLocaleString("zh-TW",{hour12:false}),submittedAt:stamp,dungeonResult:{questions:Math.max(0,Number(report.questions)||0),correct:Math.max(0,Number(report.correct)||0),zoneClears:Math.max(0,Number(report.zoneClears)||0),bestChain:Math.max(0,Number(report.bestChain)||0),finishedAt:Number(report.finishedAt)||stamp}});
  if(!old)state.submissions.push(sub);delete sub.reviewedAt;delete sub.reviewedBy;delete sub.reviewSource;
  if(CLOUD.on()&&CLOUD.role==="student")await CLOUD.writeSubmission(sub);
  addLog(s.id,"🏰 地下城作業「"+t.title+"」已達標並自動送審，等待教師通過後發放任務獎勵");return sub;
}
async function handleDungeonPacket(packet,source){
  if(!packet||packet.type!=="class_rpg_dungeon_result")return;const report=Object.assign({},packet.report||packet,{cid:packet.cid||(packet.report||{}).cid,sid:packet.sid||(packet.report||{}).sid,claimId:packet.claimId||(packet.report||{}).claimId}),claimId=String(report.claimId||"");if(!/^[A-Za-z0-9_-]{8,80}$/.test(claimId)||dungeonClaims.has(claimId))return;
  const s=stu(String(report.sid||""));if(!s||String(report.cid||"")!==String(CLOUD.cid||"offline")||(CLOUD.role==="student"&&String(s.id)!==String(view.sid)))return;dungeonClaims.add(claimId);
  try{
    let result;if(CLOUD.on()&&CLOUD.role==="student")result=await CLOUD.claimDungeonReward(report);else result=dungeonApplyLocal(s,report);
    if(result.student){const i=state.students.findIndex(x=>String(x.id)===String(s.id));if(i>=0)state.students[i]=Object.assign(state.students[i],result.student);}
    const rw=result.reward||{xp:0,gold:0};const queued=(result.submission&&result.submission.status==="pending")?result.submission:await dungeonQueueTaskReview(s,report);if(queued&&!subFor(Number(queued.taskId),s.id))state.submissions.push(queued);
    addLog(s.id,"🏰 完成地下城自主複習：答對 "+Math.max(0,Number(report.correct)||0)+"／"+Math.max(0,Number(report.questions)||0)+" 題、最高 "+Math.max(0,Number(report.bestChain)||0)+" 連擊，獲得 "+(rw.xp||0)+" XP、"+(rw.gold||0)+" 金"+((rw.learningDiamonds||0)>0?"、學習連續 +"+rw.learningDiamonds+"💎":"")+((rw.petCards||0)>0?"、寵物卡 ×"+rw.petCards:"")+(queued?"；作業成果已送教師審核":""));
    const pending=JSON.parse(localStorage.getItem(DUNGEON_PENDING_KEY)||"[]");localStorage.setItem(DUNGEON_PENDING_KEY,JSON.stringify((Array.isArray(pending)?pending:[]).filter(x=>String((x.report||x).claimId)!==claimId)));save();
    if(source&&source.postMessage)source.postMessage({type:"class_rpg_dungeon_ack",claimId,ok:true,xp:rw.xp||0,gold:rw.gold||0,learningDiamonds:rw.learningDiamonds||0,petCards:rw.petCards||0,submitted:!!queued},"*");toast(queued?"🏰 成果已回傳並送教師審核":"🏰 複習結算：+"+(rw.xp||0)+" XP、+"+(rw.gold||0)+" 金"+((rw.learningDiamonds||0)>0?"、學習連續 +"+rw.learningDiamonds+"💎":"")+((rw.petCards||0)>0?"、寵物卡 ×"+rw.petCards:""));render();
  }catch(e){dungeonClaims.delete(claimId);toast("地下城結算暫存中："+(e.message||e),true);}
}
async function processDungeonPending(){try{const q=JSON.parse(localStorage.getItem(DUNGEON_PENDING_KEY)||"[]");if(Array.isArray(q))for(const p of q.slice(0,10))await handleDungeonPacket(p,null);}catch(e){console.warn("dungeon pending",e);}}
window.addEventListener("message",e=>handleDungeonPacket(e.data,e.source));window.addEventListener("storage",e=>{if(e.key===DUNGEON_PENDING_KEY)processDungeonPending();});window.addEventListener("focus",()=>{if(view&&view.page==="student")processDungeonPending();});
function lbWeekKey(){
  const local=new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Taipei"})),one=new Date(Date.UTC(local.getFullYear(),local.getMonth(),local.getDate())),day=one.getUTCDay()||7;
  one.setUTCDate(one.getUTCDate()+4-day);const y=one.getUTCFullYear(),start=new Date(Date.UTC(y,0,1));
  return y+"-W"+String(Math.ceil((((one-start)/86400000)+1)/7)).padStart(2,"0");
}
function stu(id){ return state.students.find(s=>s.id===id) || ((window.__garenaGuests||{})[id]||null); }
function addLog(sid, msg){
  state.log.unshift({t:new Date().toLocaleString("zh-TW",{hour12:false}), sid, msg});
  if(state.log.length>300) state.log.length = 300;
}

/* ── 公式(對照正式系統)──────────────────────────── */
/* ══ 📈 三學年等級系統(公差100等差數列;滿級99)══
   1→2級需100,N→N+1級需 N×100。
   里程碑:七年級末Lv30(累計43,500)/八年級末Lv60(177,000)/九年級末Lv90(400,500)/滿級99(485,100) */
/* 🏰 榮耀之城圖示(115×128 像素圖,去背,保持原比例) */
function castleImg(size){
  const h = size, w = Math.round(size * 1.5);
  return '<img src="assets/glory-castle-v1.webp" width="'+w+'" height="'+h+'" alt="榮耀之城" '
    + 'style="object-fit:cover;object-position:center 58%;vertical-align:middle;border:3px solid #141414;border-radius:10px;filter:drop-shadow(2px 3px 0 rgba(0,0,0,.4))">';
}

/* 到達某等級所需的累計總 EXP */

/* 依等級推算所屬學年階段 */

function equipStatSum(s){
  const t={atk:0,agi:0,int:0,def:0};
  for(const slot of ALL_SLOTS){
    const it = itemById(s[slot+"Id"]); if(!it) continue;
    t.atk+=it.atk; t.agi+=it.agi; t.int+=it.int; t.def+=it.def;
  }
  return t;
}
/* ══ 技能樹系統 ══════════════════════════════════════
 * 每技能 5 級;累積已花 SP 達門檻才解鎖該階。
 * kind: passive(持續數值) / atk(攻擊時觸發) / def(受擊時觸發) */

/* 每技能 5 級;分支內位置 pos(1/2/3),下層需累積「同分支已投入 SP」達 gate。
 * kind: passive/atk(攻擊觸發)/def(受擊觸發)。desc 精簡一句。 */
   // 分支第 4 格為召喚專精，需先完整投入同系列

/* 轉職技能頁：Lv.30 二轉、Lv.60 三轉。這些能力以常駐專精加成融入一般攻擊、治療與防禦，取代舊式獨立大招。 */

/* 克制不是職業固定加成；必須把對應技能裝備進五格技能組，並在戰場實際觸發。 */

Object.keys(JOB_ADVANCEMENT).forEach(job=>[2,3].forEach(tier=>{
  const branchPos={};
  (JOB_ADVANCEMENT[job][tier]||[]).forEach(d=>{ const pos=branchPos[d[3]]=(branchPos[d[3]]||0)+1; SKILL_TREES[job].push({
    id:d[0],name:d[1],icon:d[2],branch:d[3],pos,tier,
    /* 高階節點是「已裝備才有機率施放」的戰場技能，不再只是看不到的被動加成。 */
    kind:d[4]==='power'?'atk':(d[4]==='heal'||d[4]==='tempo'?'aura':'def'),effect:d[4],short:LEGENDARY_SKILL_TEXT[d[0]]?'終極戰技':(tier===3?'傳說戰技':'轉職專精'),
    chance:tier===3?[10,13,16,19,22]:[12,15,18,21,24],
    desc:(v,c)=>LEGENDARY_SKILL_TEXT[d[0]]||(tier===3?'傳說戰技：':'戰場專精：')+(d[4]==='power'?'觸發強力職業效果，造成傷害 +':d[4]==='ward'?'觸發守護效果，受到傷害 -':d[4]==='heal'?'觸發團隊治療，效果 +':'觸發迅捷效果，行動速度 +')+v+'%・觸發率 '+c+'%',val:[2,4,6,8,10]
  }); });
}));
/* 戰士轉職技第一批：明確指定倍率、觸發率與戰場敘述；其餘職業將依相同規格逐批精修。 */

Object.entries(WARRIOR_ADVANCE_RULES).forEach(([id,rule])=>{ const sk=SKILL_TREES.Warrior.find(x=>x.id===id); if(sk) Object.assign(sk,rule,{kind:id.includes('counter')?'def':'atk',effect:null,short:id.includes('counter')?'反擊':'進攻'}); });
/* 法師、遊俠、牧師的轉職攻擊技：各自用不同倍率區間，與原始一轉技能可並存但只取本次最高倍率。 */

Object.entries(ADVANCE_ATTACK_RULES).forEach(([id,val])=>{ for(const job of Object.keys(SKILL_TREES)){ const sk=(SKILL_TREES[job]||[]).find(x=>x.id===id); if(sk){ Object.assign(sk,{kind:'atk',effect:null,short:'轉職攻擊',val,chance:[8,11,14,17,20],desc:(v,c)=>c+'% 機率施放，造成 '+v+' 倍傷害'}); break; } } });
/* 具有獨立戰術效果的轉職攻擊，描述直接對應戰場實作，而非只寫傷害倍率。 */

Object.entries(ADVANCE_SIGNATURE_DESC).forEach(([id,desc])=>{ for(const job of Object.keys(SKILL_TREES)){ const sk=(SKILL_TREES[job]||[]).find(x=>x.id===id); if(sk){ sk.desc=desc; break; } } });
/* 二轉召喚：同一位角色同時只維持一隻，召喚物不佔格、不會被攻擊，避免多人戰場卡住。 */

Object.entries(ADVANCE_SUMMON_RULES).forEach(([id,rule])=>{ for(const job of Object.keys(SKILL_TREES)){ const sk=(SKILL_TREES[job]||[]).find(x=>x.id===id); if(sk){ Object.assign(sk,rule,{kind:'atk',effect:null,short:'召喚物'}); break; } } });
/* 具移動／佈置意義的專精：不只提高面板，會在命中時改變下一段走位或戰場格。 */

Object.entries(ADVANCE_TACTIC_RULES).forEach(([id,rule])=>{ for(const job of Object.keys(SKILL_TREES)){ const sk=(SKILL_TREES[job]||[]).find(x=>x.id===id); if(sk){ Object.assign(sk,rule,{kind:'atk',effect:null,short:'戰術技'}); break; } } });
/* 二轉反應技：防護分支不只給面板數值，而是在遭受攻擊時產生可見的戰術反制。 */

Object.entries(ADVANCE_REACT_RULES).forEach(([id,rule])=>{ for(const job of Object.keys(SKILL_TREES)){ const sk=(SKILL_TREES[job]||[]).find(x=>x.id===id); if(sk){ Object.assign(sk,rule,{kind:'def',short:'二轉反應'}); break; } } });
/* 三轉終極：每一條分支都有一招最終戰技；裝備後由戰況觸發，且同一角色共用長冷卻。 */

function shouldAdvanceUltimate(s,f){
  const choices=(ADVANCE_ULTIMATES[s.job]||[]).filter(u=>activeSkillLv(s,u.id)>0);
  if(!choices.length || !skillsEnabled() || fighterCooldownLeft(f,'advUlt')>0 || (f.silenceT||0)>0) return null;
  const all=Object.values(GARENA.fighters||{}), allies=all.filter(x=>x.team===f.team), enemies=all.filter(x=>x.team!==f.team&&!x.ko);
  const hurt=allies.filter(x=>!x.ko&&x.hp/x.max<.58).length, controlled=allies.filter(x=>!x.ko&&((x.chillT||0)>0||(x.frozenT||0)>0||(x.silenceT||0)>0)).length;
  const marked=enemies.filter(x=>(x.hunterMarkT||0)>0).length;
  const nearby=enemies.filter(x=>garenaDist(f,x)<=3).length, fallen=allies.filter(x=>x.ko&&!x.revivedOnce).length;
  const can={
    skyward_slash:nearby>=3, sacred_counter:hurt>=2&&nearby>=2, heaven_guard:hurt>=2||controlled>=2,
    elemental_doom:nearby>=3, mana_overflow:nearby>=2&&allies.filter(x=>!x.ko).length>=2, world_freeze:nearby>=2&&controlled>=1,
    death_mark:marked>=2, silent_hunt:f.hp/f.max<.52&&nearby>=2, thousand_arrows:marked>=2,
    resurrection_hymn:fallen>=1, miracle_sanctum:fallen>=1||hurt>=3, eternal_prayer:controlled>=2||hurt>=3
  };
  const ready=choices.filter(u=>can[u.id]); if(!ready.length) return null;
  const priority=ready.find(u=>u.id==='resurrection_hymn')||ready.find(u=>u.id==='heaven_guard')||ready.find(u=>u.id==='elemental_doom')||ready[0];
  const chance=Math.min(12,2+activeSkillLv(s,priority.id)*2); // Lv1 4% → Lv5 12%，避免終極連續洗版
  return Math.random()*100<chance ? priority : null;
}
function advanceUltimateFx(s,u,anchor){
  advancedCombatFx(s,u.id,anchor);
  comicPop(u.icon+' '+u.name+'!','boom','#fff0a8',anchor);
  garenaLog('👑 '+s.name+' 施放三轉終極【'+u.name+'】！');
}
function advancedAttackIds(job){
  const ultimateIds=Object.values(ADVANCE_ULTIMATES).flat().map(u=>u.id);
  return skillList(job).filter(sk=>!ultimateIds.includes(sk.id) && (ADVANCE_ATTACK_RULES[sk.id] || ADVANCE_TACTIC_RULES[sk.id] || WARRIOR_ADVANCE_RULES[sk.id]&&sk.kind==='atk')).map(sk=>sk.id);
}

/* 舊帳號第一次開啟時，從已學技能挑出高階、等級較高的五招；之後完全由學生自行調整。 */

                         // 不先投入前一轉，不能直接把高階樹點滿

/* INT 冷卻縮減改採百分比：10 INT 為 0%，200 INT 達 35%。
   所有層級共用同一比例，再由技能本身的最低冷卻保護強度差異。 */

/* 每一招各自以實際秒數冷卻：轉職層數愈高、範圍與控場愈強，等待愈久；最終再套用 INT 冷卻縮減。 */
/* 1v1 節奏較短：保留技能強弱冷卻差，但加快二、三轉輪替，讓後期技能有再次出場的機會。 */

function rollCombatSkill(s,id,scope){
  if(!skillsEnabled() || !activeSkillLv(s,id)) return false;
  if(skillCooldownActive(scope,s.id,id)) return false;
  if(Math.random()*100>=skillChance(s,id)) return false;
  startSkillCooldown(scope,s,id,scope==='arena'?arenaSkillCooldownSeconds(s,id):skillCooldownSeconds(s,id));
  return true;
}
function skillsEnabled(){ return !state.skillsOff; }
function skillPassive(s, id){ return skillsEnabled() ? skillVal(s, id) : 0; }
/* 專精可疊加但有上限：防止高年級把所有 SP 投在同一類後破壞課堂戰鬥平衡。 */

function advancementBonus(s, effect){ return !skillsEnabled() ? 0 : Math.min(ADVANCE_BONUS_CAP[effect]||99, skillList(s.job).filter(sk=>sk.effect===effect).reduce((n,sk)=>n+skillVal(s,sk.id),0)); }
function advancementDamageMult(s){ return 1 + advancementBonus(s,'power')/100; }
function advancementWardMult(s){ return 1 - advancementBonus(s,'ward')/100; }
function advancementHealMult(s){ return 1 + advancementBonus(s,'heal')/100; }
function advancementTempoMult(s){ return 1 - advancementBonus(s,'tempo')/100; }
function advancementLead(s,effect){
  return skillList(s.job).filter(sk=>sk.effect===effect && activeSkillLv(s,sk.id)>0)
    .sort((a,b)=>(b.tier||1)-(a.tier||1) || activeSkillLv(s,b.id)-activeSkillLv(s,a.id))[0] || null;
}
/* 轉職專精視覺：每個職業已點出的高階節點會在其效果實際作用時署名出現。 */
function advancementFx(s,effect,anchor){
  const sk=advancementLead(s,effect); if(!sk) return;
  const crowded=GARENA&&GARENA.active&&Object.keys(GARENA.fighters||{}).length>12;
  if(Math.random()>(crowded ? .16 : .42)) return;           // 多人戰降低粒子密度，不犧牲判定
  skillFxPlay('adv_'+effect,anchor);
  const color={power:'#ffd563',ward:'#7ad0e8',heal:'#62d89a',tempo:'#a98cff'}[effect];
  comicPop(sk.icon+sk.name,'cloud',color,anchor);
}
function advancedCombatFx(s,id,anchor){
  const sk=skillDef(s.job,id); if(!sk) return;
  /* 每個轉職系列都有專屬的戰場動態，而非只有同色數字。 */
  const fxById={
    knight_charge:'knight_charge',lance_combo:'lance_combo',valor_strike:'valor_strike',shield_wall:'block',intercept:'taunt',counter_stance:'counter_stance',rally:'taunt',
    holy_guard:'shield',radiant_blade:'radiant_blade',skyward_slash:'skyward_slash',king_banner:'taunt',fortress:'block',sacred_counter:'sacred_counter',heaven_guard:'heaven_guard',
    ember_path:'blast',flame_orbit:'blast',lava_burst:'meteor',chain_storm:'chain',arcane_surge:'firebolt',thunder_prison:'spark',ice_armor:'shield',cold_snap:'frost',crystal_barrier:'block',
    rift:'storm',solar_flare:'meteor',elemental_doom:'elemental_doom',polar_domain:'freeze',storm_core:'chain',mana_overflow:'spark',absolute_zero:'freeze',ice_comet:'meteor',world_freeze:'blizzard',
    pierce_arrow:'edge',rapid_fire:'edge',hunter_mark:'expose',hunter_trap:'greed',smoke_screen:'pocket',poison_mine:'poison',swift_evade:'agi',windwalk:'agi',eagle_eye:'expose',
    shadow_clone:'shadow',phantom_combo:'shadow',death_mark:'lethal',flash_step:'agi',void_trap:'greed',silent_hunt:'shadow',arrow_rain:'storm',wind_soul:'agi',thousand_arrows:'thousand_arrows',
    cleanse:'heal',renewal:'heal',healing_wave:'groupheal',regeneration:'heal',holy_link:'shield',blessing_light:'faith',sacred_bolt:'smite',purify_smite:'judge',light_spear:'smite',
    life_domain:'groupheal',mass_restore:'groupheal',resurrection_hymn:'revive',salvation:'shield',angel_wing:'faith',miracle_sanctum:'miracle_sanctum',divine_sentence:'judge',holy_comet:'meteor',eternal_prayer:'heal'
  };
  const fxByBranch={fire:'adv_fire',thunder:'adv_thunder',ice:'adv_ice',burst:'adv_rogue',gold:'adv_rogue',support:'adv_rogue',heal:'adv_holy',buff:'adv_holy',smite:'adv_holy',atk:'adv_warrior',def:'adv_warrior',sur:'adv_warrior'};
  const colorByBranch={fire:'#ff7a3d',thunder:'#8f7aff',ice:'#8ce4ff',burst:'#a98cff',gold:'#82c55b',support:'#7de0a8',heal:'#62d89a',buff:'#ffd563',smite:'#fff0a8',atk:'#f5c518',def:'#7ad0e8',sur:'#ff936a'};
  skillFxPlay(fxById[id]||fxByBranch[sk.branch]||'adv_power',anchor,id);
  comicPop(sk.icon+sk.name+'!', 'boom', colorByBranch[sk.branch]||'#ffd563',anchor);
}

function skillTreePanel(s){
  if(!skillsEnabled()) return '<div class="panel"><div class="mini">老師目前關閉了技能樹功能。你的 SP 會保留,開啟後即可分配。</div></div>';
  const jobZh = {Warrior:"戰士",Mage:"法師",Rogue:"遊俠",Cleric:"牧師"};
  const branches = SKILL_BRANCHES[s.job] || [];
  /* 轉職頁永遠可瀏覽：學生先看得到傳說終結技與前置要求，達成條件後才可加點。 */
  const maxTier = 3;
  const tier = Math.min(maxTier, Math.max(1, view.skillTier||1));
  const tierMeta = {1:['初階職業','Lv.1 解鎖'],2:['二轉專精','Lv.30 解鎖'],3:['三轉傳說','Lv.60 解鎖']}[tier];
  // 一個技能節點
  const node = (sk)=>{
    const lv = skillLv(s, sk.id);
    const equipped = lv>0 && skillEquipped(s,sk.id);
    const can = canLevelSkill(s, sk);
    const need = BRANCH_GATE[sk.pos-1];
    const has = spSpentBranch(s, s.job, sk.branch, sk.tier||1);
    const locked = has < need;
    const dots = [1,2,3,4,5].map(i=>'<i class="'+(i<=lv?"on":"")+'"></i>').join("");
    const kindTag = LEGENDARY_SKILL_TEXT[sk.id] ? "👑 終極戰技" : (sk.kind==="atk"?"主動觸發":sk.kind==="def"?"防禦觸發":sk.kind==="aura"?"團隊光環":"被動效果");
    const curDesc = lv>0 ? sk.desc(sk.val[lv-1], sk.chance?sk.chance[lv-1]:null)
                         : sk.desc(sk.val[0], sk.chance?sk.chance[0]:null);
    return '<div class="skill-node '+(lv>0?"owned ":"")+(locked?"locked ":"")+(can?"can-up":"")+'">'
      + '<div class="skill-node-top"><span class="skill-icon">'+sk.icon+'</span><span><span class="skill-name">'+esc(sk.name)+'</span><span class="skill-type">'+kindTag+'</span></span>'
      + (lv?'<button class="skill-equip '+(equipped?'equipped':'')+'" data-skequip="'+sk.id+'" aria-label="'+(equipped?'卸下戰場技能':'裝備戰場技能')+'" title="'+(equipped?'從五格戰場技能中卸下':'裝備到五格戰場技能')+'">'+(equipped?'卸下':'裝備')+'</button>':'')
      + '<button class="skill-up '+(can?"ready":"")+'" data-skup="'+sk.id+'"'+(can?"":" disabled")+'>+</button></div>'
      + '<div class="skill-rank">'+dots+'<b>Lv.'+lv+'/5</b></div>'
      + '<div class="skill-desc">'+esc(curDesc)+'</div>'
      + (SKILL_COUNTER_TEXT[sk.id]?'<div class="mini" style="margin-top:4px;color:#92e6c6">🔁 技能克制：'+esc(SKILL_COUNTER_TEXT[sk.id])+'</div>':'')
      + (ULTIMATE_TRIGGER_TEXT[sk.id]?'<div class="mini" style="margin-top:4px;color:#ffd86b">⚡ 終極觸發：'+esc(ULTIMATE_TRIGGER_TEXT[sk.id])+'・Lv.1 4% → Lv.5 12%</div>':'')
      + (lv && sk.kind!=="passive" ? '<div class="mini" style="margin-top:4px;color:#b9c9ee">⌛ 戰場冷卻 '+skillCooldownSeconds(s,sk.id)+' 秒（智力可縮短）</div>' : '')
      + (locked ? '<div class="skill-lock">🔒 本分支再投入 '+(need-has)+' SP 解鎖</div>' : "")
      + '</div>';
  };
  // 三分支並排,每分支直向三格 + 連接線
  let cols = '<div class="skill-grid">';
  for(const [bkey, blabel] of branches){
    const inB = (SKILL_TREES[s.job]||[]).filter(sk=>sk.branch===bkey && (sk.tier||1)===tier).sort((a,b)=>a.pos-b.pos);
    let col = '<div class="skill-branch '+bkey+'"><div class="skill-branch-head"><span>'+blabel+'</span><b>'+spSpentBranch(s,s.job,bkey,tier)+' SP</b></div>';
    inB.forEach((sk,i)=>{
      if(i>0) col += '<div class="skill-link"></div>';
      col += node(sk);
    });
    col += '</div>';
    cols += col;
  }
  cols += '</div>';
  // 效果總覽
  const summary=[], atkList=[], defList=[];
  for(const sk of skillList(s.job)){
    const lv=skillLv(s,sk.id); if(!lv) continue;
    if(sk.kind==="passive") summary.push(sk.icon+sk.name+":"+sk.desc(sk.val[lv-1]));
    else if(sk.kind==="aura") atkList.push(sk.icon+sk.name+"(光環) "+(sk.chance?sk.chance[lv-1]+"%":""));
    else if(sk.kind==="atk") atkList.push(sk.icon+sk.name+" "+(sk.chance?sk.chance[lv-1]+"%":""));
    else defList.push(sk.icon+sk.name+" "+(sk.chance&&sk.chance[lv-1]?sk.chance[lv-1]+"%":""));
  }
  const tierTabs = [1,2,3].map(t=>{ const open=skillTierUnlocked(s,t), m={1:'🌱 初階',2:'⚔️ 二轉',3:'👑 三轉'}[t], lock=t===1?'':skillTierLockText(s,t); return '<button class="tab '+(tier===t?'on ':'')+(open?'':'')+'" data-skilltier="'+t+'" title="'+esc(open?'':lock)+'">'+m+(open?'':' 🔒')+'</button>'; }).join('');
  const advanceReadout = [['power','✦ 傷害'],['ward','🛡 減傷'],['heal','💚 治療'],['tempo','🌪 迅捷']]
    .filter(([k])=>advancementBonus(s,k)>0).map(([k,n])=>'<span>'+n+' +'+advancementBonus(s,k)+'% / '+ADVANCE_BONUS_CAP[k]+'%</span>').join('');
  const equippedSkills=normalizeSkillLoadout(s).map(id=>skillDef(s.job,id)).filter(Boolean);
  const loadout='<div class="skill-summary" style="margin-top:8px"><span style="background:var(--gold);color:#141414">⚔️ 戰場技能 '+equippedSkills.length+'/'+SKILL_LOADOUT_MAX+'</span>'
    + (equippedSkills.map(sk=>'<span>'+sk.icon+' '+esc(sk.name)+'</span>').join('')||'<span>從下方已學技能按「裝備」加入技能組</span>')+'</div>';
  const overview = '<div class="panel skill-hero"><h3>🌳 '+jobZh[s.job]+' 技能魔導盤 <span class="skill-sp">✦ 可用 SP '+s.spPoints+'</span></h3>'
    + '<div class="tabs" style="margin:8px 0">'+tierTabs+'</div>'
    + '<div class="mini" style="line-height:1.8"><b>'+tierMeta[0]+'</b>・'+tierMeta[1]+'。每個分支投入 <b>3 / 6 SP</b> 後可解鎖下一階；二轉需 <b>Lv.30＋一轉累積 '+ADVANCE_SP_NEED[2]+' SP</b>，三轉需 <b>Lv.60＋二轉累積 '+ADVANCE_SP_NEED[3]+' SP</b>。<b>已學技能須裝進上方五格戰場技能欄才會觸發。</b><br><span style="color:#92d8ff">藍色「裝備」＝加入戰場技能組</span>・<span style="color:#ffb3c5">紅色「卸下」＝移出技能組</span>・最右側「＋」＝升級技能。</div>'
    + loadout + '<div class="skill-summary">'
    + (summary.map(x=>'<span>⚙ '+esc(x)+'</span>').join(""))
    + (atkList.map(x=>'<span>🗡 '+esc(x)+'</span>').join(""))
    + (defList.map(x=>'<span>🛡 '+esc(x)+'</span>').join(""))
    + advanceReadout
    + (!summary.length&&!atkList.length&&!defList.length?'<span>💡 升級獲得 1 SP；Lv.30 二轉與 Lv.60 三轉各額外獲得 +2 SP。</span>':"")
    + '</div></div>';
  // 共用樹(空則不顯示)
  let common = "";
  if(SKILL_TREES.common.length){
    common = '<div class="panel"><h3>🌐 共用技能</h3><div style="display:flex;gap:8px">';
    for(const sk of SKILL_TREES.common) common += '<div style="flex:1">'+node(sk)+'</div>';
    common += '</div><div style="margin-top:6px;color:#5a5a5a;font-size:12px">想重來?商店「洗技藥水」退還全部 SP。</div></div>';
  }
  return overview + '<div class="panel"><h3>✦ '+tierMeta[0]+' 技能樹</h3>' + cols + '</div>' + common;
}
function levelSkill(sid, id){
  const s = stu(sid); if(!s) return;
  const sk = skillDef(s.job, id); if(!sk) return;
  if(!canLevelSkill(s, sk)){ toast("無法升級:SP 不足、已滿級、或前置階未解鎖", true); return; }
  s.skills[id] = skillLv(s, id) + 1;
  const load=normalizeSkillLoadout(s);
  if(load.length<SKILL_LOADOUT_MAX && !load.includes(id)) s.skillLoadout.push(id); // 新手先自動補入空技能欄
  s.spPoints--;
  skillFxPlay(id, '[data-skup="'+id+'"]');
  save(); toast("✦ "+sk.icon+" "+sk.name+" → Lv."+s.skills[id]); render();
}
function toggleSkillEquip(sid,id){
  const s=stu(sid), sk=s&&skillDef(s.job,id); if(!s||!sk||skillLv(s,id)<=0) return;
  const load=normalizeSkillLoadout(s), at=load.indexOf(id);
  if(at>=0){ s.skillLoadout.splice(at,1); }
  else{
    if(load.length>=SKILL_LOADOUT_MAX){ toast('戰場最多只能裝備 '+SKILL_LOADOUT_MAX+' 個技能，請先卸下一招。',true); return; }
    s.skillLoadout.push(id);
  }
  save(); render();
}

/* 👑 城主稱號判定(佔領期間動態生效) */
/* 🔒 隱私遮罩:姓+OO(家長頁看他人、世界榜跨班上傳用) */
function maskName(n){ n = String(n||"").trim(); return n.length<=1 ? n : n[0] + "OO"; }
function jobNameOf(s){if(s&&(s.jobPending===true||s.registrationComplete===false))return "待選職業";const j=(JOB_INFO[s.job]||{}).name||"未指定";return s.customJobName?s.customJobName+"("+j+")":j;}   // 🌠 流星卡自訂職業名
function isGloryLord(s){ return !!(state.castle && state.castle.owner && s.group===state.castle.owner); }
function isPeakLord(s){ return !!(PEAK.isOurs() && s.group===state.worldPeak.owner.group); }
/* 🐉 四聖獸寵物:裝備後環繞角色,+2 對應能力 */
const PETS = { 1:{name:"青龍",emoji:"🐉",statName:"攻擊", skill:"青龍擺尾", desc:"攻擊命中後 12% 機率追加 60% 傷害"},
               2:{name:"朱雀",emoji:"🐦",statName:"智力", skill:"朱雀燎原", desc:"攻擊命中後 10% 機率火焰濺射周圍敵人 40% 傷害"},
               3:{name:"白虎",emoji:"🐯",statName:"敏捷", skill:"白虎疾步", desc:"受擊時 12% 機率完全閃避"},
               4:{name:"玄武",emoji:"🐢",statName:"防禦", skill:"玄武堅甲", desc:"受擊時 12% 機率減免一半傷害"} };
const PET_TIER_NAMES=["","一階","二階","三階","四階","五階史詩","六階神話","七階終極"];
const PET_GROUPS={assist:{name:"輔助系",icon:"🪶",common:201,rare:211,color:"#64c9d8"},enhance:{name:"強化系",icon:"🛡️",common:202,rare:212,color:"#c99a4b"},attack:{name:"攻擊系",icon:"⚔️",common:203,rare:213,color:"#df665d"},recovery:{name:"回復系",icon:"💚",common:204,rare:214,color:"#66bb73"}};
const PET_LEGEND_RECIPES={fusion_t7_1:221,fusion_t7_2:222,fusion_t7_3:223,fusion_t7_4:224,fusion_t7_5:225,fusion_t7_6:226},PET_LEGEND_DIAMONDS=1200;
const PET_ULTIMATE_FALLBACK={
  fusion_t7_1:{c:'#d63a32',h:'#ffd85a',body:'<rect x="1" y="9" width="9" height="6"/><rect x="22" y="9" width="9" height="6"/><rect x="9" y="5" width="14" height="20"/><rect x="10" y="24" width="5" height="6"/><rect x="18" y="24" width="5" height="6"/>'},
  fusion_t7_2:{c:'#6651bd',h:'#62e8ff',body:'<rect x="5" y="7" width="22" height="18"/><rect x="8" y="24" width="5" height="6"/><rect x="20" y="24" width="5" height="6"/><rect x="2" y="3" width="28" height="2"/>'},
  fusion_t7_3:{c:'#ef6b35',h:'#ffd85a',body:'<rect x="1" y="8" width="11" height="12"/><rect x="20" y="8" width="11" height="12"/><rect x="11" y="5" width="10" height="19"/><rect x="7" y="24" width="5" height="7"/><rect x="14" y="23" width="5" height="9"/><rect x="21" y="24" width="5" height="7"/>'},
  fusion_t7_4:{c:'#2ba8b1',h:'#74ffff',body:'<rect x="9" y="5" width="15" height="12"/><rect x="5" y="15" width="23" height="10"/><rect x="6" y="24" width="5" height="7"/><rect x="21" y="24" width="5" height="7"/><rect x="13" y="1" width="3" height="8"/>'},
  fusion_t7_5:{c:'#742181',h:'#ff5edb',body:'<rect x="8" y="5" width="16" height="21"/><rect x="1" y="12" width="8" height="4"/><rect x="1" y="20" width="8" height="4"/><rect x="23" y="12" width="8" height="4"/><rect x="23" y="20" width="8" height="4"/><rect x="5" y="1" width="6" height="5"/><rect x="21" y="1" width="6" height="5"/>'},
  fusion_t7_6:{c:'#e7d9b8',h:'#55bfff',body:'<rect x="8" y="5" width="16" height="22"/><rect x="1" y="13" width="7" height="14"/><rect x="25" y="8" width="3" height="19"/><rect x="9" y="26" width="5" height="5"/><rect x="19" y="26" width="5" height="5"/>'}
};
function safePetArt(art){art=String(art||"");return /^data:image\/(png|webp);base64,[a-z0-9+/=]+$/i.test(art)&&art.length<=60000?art:"";}
function petFallbackArt(card){
  const g=PET_GROUPS[card&&card.group]||PET_GROUPS.assist,t=Math.max(1,Math.min(7,Number(card&&card.tier)||1)),hi=t>=7?"#ffe66d":t>=5?"#e6a5ff":"#ffffff";
  const u=PET_ULTIMATE_FALLBACK[card&&card.kind];
  if(u){
    const n=Math.max(1,Object.keys(PET_ULTIMATE_FALLBACK).indexOf(card.kind)+1);let micro='';
    for(let i=0;i<15;i++){const x=4+((i*11+n*7)%55),y=5+((i*17+n*5)%53);micro+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+(i%3?u.h:'#fff9dc')+'"/>';}
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" shape-rendering="crispEdges"><rect width="64" height="64" fill="none"/><g transform="scale(2)" fill="#1b1125">'+u.body+'</g><g transform="translate(2 2) scale(1.88)" fill="'+u.c+'">'+u.body+'</g>'+micro+'<rect x="22" y="22" width="6" height="3" fill="#fff7d1"/><rect x="38" y="22" width="6" height="3" fill="#fff7d1"/><rect x="25" y="23" width="1" height="2" fill="#120b1d"/><rect x="41" y="23" width="1" height="2" fill="#120b1d"/><rect x="30" y="34" width="6" height="6" fill="'+u.h+'"/><rect x="32" y="36" width="2" height="2" fill="#fff"/><rect x="4" y="56" width="6" height="3" fill="'+u.h+'"/><rect x="54" y="6" width="6" height="3" fill="'+u.h+'"/></svg>';
    return 'data:image/svg+xml,'+encodeURIComponent(svg);
  }
  const advanced=t>=4?'<rect x="5" y="6" width="4" height="4" fill="#251b31"/><rect x="23" y="6" width="4" height="4" fill="#251b31"/><rect x="6" y="5" width="2" height="4" fill="'+hi+'"/><rect x="24" y="5" width="2" height="4" fill="'+hi+'"/><rect x="14" y="3" width="5" height="4" fill="'+hi+'"/>':'';
  const epic=t>=5?'<rect x="2" y="13" width="5" height="3" fill="'+hi+'"/><rect x="26" y="13" width="4" height="3" fill="'+hi+'"/><rect x="3" y="25" width="3" height="2" fill="#fff3a0"/><rect x="27" y="24" width="3" height="2" fill="#fff3a0"/>':'';
  const myth=t>=6?'<rect x="3" y="1" width="26" height="2" fill="#a8ecff"/><rect x="1" y="5" width="2" height="21" fill="#a8ecff"/><rect x="29" y="5" width="2" height="21" fill="#a8ecff"/><rect x="14" y="18" width="5" height="5" fill="#ffffff"/>':'';
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges"><rect width="32" height="32" fill="none"/>'+advanced+epic+myth+'<rect x="8" y="9" width="16" height="15" fill="'+g.color+'"/><rect x="5" y="13" width="5" height="9" fill="#251b31"/><rect x="22" y="13" width="5" height="9" fill="#251b31"/><rect x="11" y="6" width="10" height="5" fill="'+hi+'"/><rect x="11" y="14" width="3" height="3" fill="#251b31"/><rect x="18" y="14" width="3" height="3" fill="#251b31"/><rect x="14" y="20" width="4" height="2" fill="#251b31"/><rect x="10" y="24" width="5" height="5" fill="#251b31"/><rect x="18" y="24" width="5" height="5" fill="#251b31"/></svg>';
  return 'data:image/svg+xml,'+encodeURIComponent(svg);
}
function petArtHref(card){return safePetArt(card&&card.art)||petFallbackArt(card||{});}
function petCardArtHtml(card,size=82){return '<img class="pet-card-pixel" src="'+esc(petArtHref(card))+'" alt="'+esc(card.name||'寵物')+'" width="'+size+'" height="'+size+'">';}
function petCardsOf(s){
  s.petCards=s.petCards||{};return Object.entries(s.petCards).map(([kind,c])=>Object.assign({kind,count:0,tier:1,group:"assist",icon:"🐾",name:"未知寵物"},c||{},{kind,count:Math.max(0,Number(c&&c.count)||0),tier:Math.max(1,Math.min(7,Number(c&&c.tier)||1))})).filter(c=>c.count>0);
}
function petAddCard(s,card,count=1){
  if(!card||!card.kind)return false;s.petCards=s.petCards||{};const kind=String(card.kind).slice(0,60),old=s.petCards[kind]||{};
  s.petCards[kind]={kind,name:String(card.name||old.name||"地城寵物").slice(0,30),icon:String(card.icon||old.icon||"🐾").slice(0,4),art:safePetArt(card.art)||safePetArt(old.art),tier:Math.max(1,Math.min(7,Number(card.tier)||Number(old.tier)||1)),group:PET_GROUPS[card.group]?card.group:(old.group||"assist"),personalityId:String(card.personalityId||old.personalityId||"calm").slice(0,20),count:(Number(old.count)||0)+Math.max(1,Number(count)||1)};return true;
}
function petCraftRecipe(card){
  if(!card)return null;const legendId=PET_LEGEND_RECIPES[card.kind];if(legendId)return {itemId:legendId,diamonds:PET_LEGEND_DIAMONDS,unique:true,label:"唯一傳說"};const g=PET_GROUPS[card.group]||PET_GROUPS.assist,isCommon=Number(card.tier)<=2;return {itemId:isCommon?g.common:g.rare,diamonds:0,unique:false,label:isCommon?"一般":"稀有"};
}
function petCraftLocal(s,kind){
  const c=s.petCards&&s.petCards[kind];if(!c||Number(c.count)<1)return null;const rec=petCraftRecipe(c),it=rec&&itemById(rec.itemId);if(!it)return null;
  s.petLegendCrafted=s.petLegendCrafted||{};if(rec.unique&&s.petLegendCrafted[kind])throw new Error("這件唯一傳說裝備已製作過");if(rec.unique&&(Number(s.diamonds)||0)<rec.diamonds)throw new Error("唯一傳說製作需要 "+rec.diamonds+" 鑽石");if(rec.unique&&(s.bagItems||[]).length>=BAG_MAX)throw new Error("背包已滿，請先整理背包再製作唯一傳說裝備");
  c.count--;if(c.count<=0){delete s.petCards[kind];if(String(s.petCardId)===String(kind))s.petCardId=null;}if(rec.unique){s.diamonds-=rec.diamonds;s.petLegendCrafted[kind]=true;}const pushed=bagPush(s,it.id);return {item:it,recipe:rec,pushed};
}
function petFuseLocal(s,tier){
  tier=Math.max(1,Math.min(6,Number(tier)||1));const pool=petCardsOf(s).filter(c=>c.tier===tier),units=[];pool.forEach(c=>{for(let n=0;n<c.count&&units.length<3;n++)units.push(c);});if(units.length<3)return null;
  units.forEach(c=>{const live=s.petCards[c.kind];live.count--;if(live.count<=0){delete s.petCards[c.kind];if(String(s.petCardId)===String(c.kind))s.petCardId=null;}});
  const keys=units.map(c=>c.kind).sort(),seed=keys.join("|").split("").reduce((n,ch)=>(n*33+ch.charCodeAt(0))>>>0,5381),next=tier+1,groups=units.map(c=>c.group),group=groups.sort((a,b)=>groups.filter(x=>x===b).length-groups.filter(x=>x===a).length)[0]||"assist",g=PET_GROUPS[group]||PET_GROUPS.assist;
  const card={kind:"class_pet_t"+next+"_"+seed.toString(36),name:PET_TIER_NAMES[next]+"・"+units.map(c=>c.name.slice(0,2)).join("")+"獸",icon:next>=7?"🌟":next>=5?"🔱":g.icon,tier:next,group,personalityId:units[0].personalityId||"calm"};petAddCard(s,card,1);return card;
}
async function petStoreAction(s,action,payload){
  if(CLOUD.on()&&CLOUD.role==="student"){const r=await runInventoryAction(s.id,action,payload||{});return r;}
  let message="寵物資料已更新";
  if(action==="petEquip"){const kind=String(payload.kind||"");if(!s.petCards[kind]||Number(s.petCards[kind].count)<1)throw new Error("沒有這張寵物卡");s.petCardId=kind;s.petId=null;message="已裝備「"+s.petCards[kind].name+"」";}
  else if(action==="petUnequip"){s.petCardId=null;s.petId=null;message="已卸下寵物";}
  else if(action==="petCraft"){const r=petCraftLocal(s,String(payload.kind||""));if(!r)throw new Error("沒有可製作的寵物卡");message="製作成功：「"+r.item.name+"」已放入背包"+(r.recipe.unique?"（唯一傳說）":"");}
  else if(action==="petFuse"){const c=petFuseLocal(s,Number(payload.tier));if(!c)throw new Error("同階寵物卡合計需要 3 張");message="合成成功："+c.name;}
  save();return {student:s,message};
}
                                      // 四項戰鬥能力含裝備、稱號與暫時增益皆不超過 200
function totalStats(s){
  const e = equipStatSum(s);
  const al = s.alloc || {atk:0,agi:0,int:0,def:0};
  const t = {atk:s.baseAtk+e.atk+al.atk, agi:s.baseAgi+e.agi+al.agi, int:s.baseInt+e.int+al.int, def:s.baseDef+e.def+al.def};
  const te = titleEffect(s);                            // 配戴稱號的隱藏效果
  t.atk += te.atk; t.def += te.def; t.agi += te.agi; t.int += te.int;
  if(s.glowBuff){                                       // 光暈觸發的暫時增益(Boss戰持續數回合)
    for(const stat in s.glowBuff){
      if(s.glowBuff[stat] && s.glowBuff[stat].turns>0) t[stat] += s.glowBuff[stat].amt;
    }
  }
  for(const key of ['atk','def','agi','int']) t[key]=Math.max(0,Math.min(STAT_CAP,Math.round((t[key]||0)*10)/10));
  return t;
}
function skillMaxHpBonus(s){ return skillPassive(s,"tough") + titleEffect(s).hp; }
/* v61 能力值效果重塑:INT/AGI 不再影響 XP/金倍率(改為戰鬥效果) */
function xpMultiplier(s){ return Math.max(0.01, (1 + skillPassive(s,"study")/100) * (1 + titleEffect(s).xpMul)); }
function goldMultiplier(s){ return Math.max(0.01, (1 + skillPassive(s,"wealth")/100) * (1 + titleEffect(s).goldMul)); }
/* INT → 技能觸發率只保留小幅加成；10→200 INT 線性成長至 +6%。 */
function intSkillBonus(s){ return Math.min(6,Math.max(0,(totalStats(s).int-10)/190*6)); }
/* AGI → 迴避率:10→200 AGI 線性成長至 25%(競技場與團體戰生效)。 */
/* 敏捷基礎迴避固定上限 25%；遊俠僅限「已裝備」的疾閃／疾風／瞬步／風之靈可突破至最高 40%。 */
function rogueDodgeProfile(s){
  if(!s || s.job!=="Rogue" || !skillsEnabled()) return {bonus:0,cap:25};
  const lv=id=>activeSkillLv(s,id);
  const capBonus=Math.min(15,lv('swift_evade')*2 + lv('windwalk')*1 + lv('flash_step')*1.5 + lv('wind_soul')*.5);
  const bonus=Math.min(7,lv('swift_evade')*.45 + lv('windwalk')*.25 + lv('flash_step')*.45 + lv('wind_soul')*.2);
  return {bonus,cap:25+capBonus};
}
function agiDodge(s){ const p=rogueDodgeProfile(s),base=Math.max(0,totalStats(s).agi-10)/190*25; return Math.min(p.cap,base+p.bonus); }

/* ══ 共用爆擊系統 ═══════════════════════════════════════════
   普攻與直接傷害技能皆能爆擊；敏捷只提供小幅加成，避免同時掌握速度、迴避與爆擊而失衡。
   遊俠的一轉「暴擊／致命」本身已含 2／2.5 倍倍率，因此命中時標記為必爆，但不再重複乘算。
   終極、召喚、反傷、持續傷害與建築傷害由呼叫端排除，防止大範圍傷害連鎖暴增。 */
const CRIT_TUNE={
  Warrior:{base:5,cap:22,mult:1.55}, Mage:{base:4,cap:18,mult:1.50},
  Rogue:{base:9,cap:36,mult:1.60}, Cleric:{base:3,cap:14,mult:1.50}
};
function combatCritProfile(s,skillId){
  const tune=CRIT_TUNE[(s&&s.job)||'Warrior']||CRIT_TUNE.Warrior;
  const agi=s?Math.max(0,(totalStats(s).agi||0)-10):0;
  const agiBonus=Math.min(10,agi/190*10);
  const embedded=skillId==='edge'||skillId==='lethal';
  return {
    chance:embedded?100:Math.min(tune.cap,tune.base+agiBonus),
    cap:tune.cap,
    mult:embedded?1:tune.mult,
    embedded:embedded
  };
}
function resolveCriticalHit(s,skillId,dmg,options){
  const opt=options||{}, raw=Math.max(1,Math.round(dmg||0));
  if(!s||opt.allow===false) return {dmg:raw,crit:false,chance:0,mult:1};
  const p=combatCritProfile(s,skillId);
  const chance=Math.max(0,Math.min(100,p.chance*(opt.chanceScale==null?1:opt.chanceScale)));
  const crit=p.embedded||Math.random()*100<chance;
  return {dmg:crit?Math.max(1,Math.round(raw*p.mult)):raw,crit:crit,chance:chance,mult:p.mult,embedded:p.embedded};
}

/* 升級:依職業成長屬性、+10 HP 並回滿(v2 設計) */
function applyLevelUps(s, gainedXp){
  s.xp += gainedXp; s.totalXp += gainedXp;
  let ups = 0;
  while(s.level < LEVEL_CAP && s.xp >= xpForNextLevel(s.level)){
    s.xp -= xpForNextLevel(s.level);
    s.level++; s.spPoints++; ups++;
    if(s.level===5 || s.level===15 || s.level===30 || s.level===60) s.spPoints += 2;   // 轉職里程碑
    s.statPoints = (s.statPoints||0) + ((s.level===5||s.level===15||s.level===30||s.level===60) ? 2 : 1);   // 自由能力點(里程碑2點)
    if(s.level===30) setTimeout(()=>levelUpFx("⚔️ "+s.name+" 完成二轉！進階技能樹已解鎖"), 180);
    if(s.level===60) setTimeout(()=>levelUpFx("👑 "+s.name+" 完成三轉！傳說技能樹已解鎖"), 180);
    const g = JOB_INFO[s.job].growth;
    s.baseAtk+=g.atk; s.baseDef+=g.def; s.baseAgi+=g.agi; s.baseInt+=g.int;
    s.maxHp += 10; s.currentHp = s.maxHp;
  }
  return ups;
}

/* ── 成就 ─────────────────────────────────────────── */
function unlock(s, achId){
  if(s.achievements.includes(achId)) return;
  const a = ACHIEVEMENTS.find(x=>x.id===achId); if(!a) return;
  s.achievements.push(achId);
  addLog(s.id, "獲得稱號【"+a.title+"】"+a.icon);
  toast(a.icon+" "+s.name+" 獲得稱號【"+a.title+"】!可到角色頁配戴");
  sfx("achieve");
}
function checkAchievements(s){
  if(s.level>=3) unlock(s,"lv3");
  if(s.level>=5) unlock(s,"lv5");
  if(s.gold>=1000) unlock(s,"gold1000");
  if(EQUIP_SLOTS.every(slot=>s[slot+"Id"])) unlock(s,"fullset");
  if(approvedCount(s.id)>=3) unlock(s,"task3");
  if(approvedCount(s.id)>=10) unlock(s,"task10");
  if((s.lessonAnswers||0)>=5) unlock(s,"lesson5");
  if(((s.learningStreak||{}).days||0)>=3) unlock(s,"streak3");
  if((s.thanksSentTotal||0)>=5) unlock(s,"thanks5");
}

/* ── 老師加分(即時回饋 + 寶箱 + 班級目標)─────────── */
/* ══ 📊 每日常規 EXP 上限管制 ══
   依學生所在學年階段給定每日天花板;額外任務(isQuest)不受此限。 */
function dailyCapOf(s){ return gradeStageOf(s.level).dailyCap; }
function dailyUsed(s){
  const t = todayStr();
  if(!s.dailyXp || s.dailyXp.date !== t) s.dailyXp = {date:t, sum:0};
  return s.dailyXp.sum;
}
function dailyLeft(s){ return Math.max(0, dailyCapOf(s) - dailyUsed(s)); }
/* 依上限裁切本次可發的常規 EXP,回傳實發量 */
function clampDailyXp(s, xp){
  if(!state.dailyCapOn) return xp;                        // 老師可關閉此機制
  const left = dailyLeft(s);
  const give = Math.max(0, Math.min(xp, left));
  s.dailyXp.sum += give;
  return give;
}
/* ══ 💰 班級經濟控制 ══
   金幣視為日常流通貨幣；鑽石是稀有價值單位，固定 1💎＝1,000 金。
   匯率只用於估值與教師決策，不開放學生自由兌換，避免套利與通膨。 */

function economyCfg(){
  state.economy=Object.assign({goldPerDiamond:GOLD_PER_DIAMOND,dailyGoldCap:500,dungeonDailyGoldCap:20,peerReviewGold:20,peerReviewDiamondEvery:20,peerReviewWeeklyDiamondCap:1,rewardDiamondWeeklyCap:3,learningDiamondWeeklyCap:2,totalDiamondWeeklyCap:6,goldIssued:0,goldSpent:0},state.economy||{});
  state.economy.goldPerDiamond=GOLD_PER_DIAMOND;return state.economy;
}
function studentDiamondFlow(s){
  const week=lbWeekKey();s.diamondFlow=s.diamondFlow||{week:"",reward:0,learning:0,review:0,total:0};
  if(s.diamondFlow.week!==week)s.diamondFlow={week,reward:0,learning:0,review:0,total:0};
  ["reward","learning","review","total"].forEach(k=>s.diamondFlow[k]=Math.max(0,Number(s.diamondFlow[k])||0));return s.diamondFlow;
}
function creditDiamonds(s,amount,source){
  amount=Math.max(0,Math.floor(Number(amount)||0));if(!s||!amount)return 0;
  const cfg=economyCfg(),flow=studentDiamondFlow(s),key=["reward","learning","review"].includes(source)?source:"reward";
  const sourceCap=key==="reward"?cfg.rewardDiamondWeeklyCap:(key==="learning"?cfg.learningDiamondWeeklyCap:cfg.peerReviewWeeklyDiamondCap);
  const give=Math.min(amount,Math.max(0,Number(sourceCap)||0)-flow[key],Math.max(0,Number(cfg.totalDiamondWeeklyCap)||0)-flow.total);
  if(give<=0)return 0;s.diamonds=(Number(s.diamonds)||0)+give;flow[key]+=give;flow.total+=give;return give;
}
function studentGoldFlow(s){
  const day=todayStr();s.goldFlow=s.goldFlow||{date:"",issued:0,spent:0};
  if(s.goldFlow.date!==day)s.goldFlow={date:day,issued:0,spent:0};
  s.goldFlow.issued=Math.max(0,Number(s.goldFlow.issued)||0);s.goldFlow.spent=Math.max(0,Number(s.goldFlow.spent)||0);return s.goldFlow;
}
function creditGold(s,amount,source,limited){
  amount=Math.max(0,Math.floor(Number(amount)||0));if(!s||!amount)return 0;
  const cfg=economyCfg(),flow=studentGoldFlow(s);let give=amount;
  if(limited!==false)give=Math.min(give,Math.max(0,Number(cfg.dailyGoldCap)||0)-flow.issued);
  if(!give)return 0;
  s.gold=(Number(s.gold)||0)+give;flow.issued+=give;cfg.goldIssued=(Number(cfg.goldIssued)||0)+give;
  return give;
}
function debitGold(s,amount,source){
  amount=Math.max(0,Math.floor(Number(amount)||0));if(!s||!amount||Number(s.gold)<amount)return false;
  s.gold-=amount;const cfg=economyCfg(),flow=studentGoldFlow(s);flow.spent+=amount;cfg.goldSpent=(Number(cfg.goldSpent)||0)+amount;return true;
}
function reward(sid, baseXp, baseGold, reason, fxPoint, isQuest, suppressMentorReward, suppressRender){
  const s = stu(sid); if(!s) return;
  let fx = Math.round(baseXp * xpMultiplier(s));
  if(!isQuest && fx > 0){                                 // 📊 常規加分受每日上限管制
    const before = fx;
    fx = clampDailyXp(s, fx);
    if(fx < before){
      toast("📊 "+s.name+" 今日常規 EXP 已達上限("+dailyCapOf(s)+"),本次只發 "+fx+" XP"+(fx===0?" — 可改用「額外任務」發放":""), fx===0);
    }
  }
  const wantedGold = Math.round(baseGold * goldMultiplier(s));
  const fg = creditGold(s,wantedGold,reason,true);
  if(fg<wantedGold)toast("💰 "+s.name+" 今日金幣發行已達 "+economyCfg().dailyGoldCap+" 金上限，本次實發 "+fg+" 金",fg===0);
  const ups = applyLevelUps(s, fx);
  progAddXp(fx);                                             // 每日探索進度(取代舊班級目標)

  let extra = "", chestGold = 0;
  if(Math.random() < 0.12 && (fx>0 || fg>0)){   // 寶箱事件
    chestGold = creditGold(s,10 + Math.floor(Math.random()*21),"課堂寶箱",true);
    extra = ",並發現寶箱 🎁 +"+chestGold+" 金幣!";
    sfx("chest");
  }
  // 🤝 日常指導以金幣回饋；高價值鑽石只保留給累積同儕代審里程碑。
  if(fx >= 5 && !suppressMentorReward){
    const lid = state.groupLeaders && state.groupLeaders[s.group];
    if(lid && lid !== s.id){
      const leader = stu(lid);
      if(leader){
        const mentorGold=creditGold(leader,Math.max(20,Math.min(100,25*(Number(s.mentorTier)||1))),"同儕指導",true);
        if(mentorGold)addLog(lid,"🤝 指導 "+s.name+" 有成，獲得 "+mentorGold+" 金幣");
      }
    }
  }
  // 加分紀錄(記實發含倍率與寶箱,供撤銷;最多留300筆)
  state.awardLog.push({ id: Date.now()+"-"+Math.floor(Math.random()*1e4), sid,
    xp: fx, gold: fg + chestGold, reason: reason||"老師獎勵",
    t: new Date().toLocaleString("zh-TW",{hour12:false}), reverted:false });
  if(state.awardLog.length > 300) state.awardLog = state.awardLog.slice(-300);
  addLog(sid, (reason||"老師獎勵")+",獲得 "+fx+" XP 和 "+fg+" 金幣"+(ups?",升至 Lv."+s.level+"!":"")+extra);
  checkAchievements(s);
  checkClassGoal();
  // 批次加分只抑制主畫面重繪，達成班級里程碑仍要播出全螢幕慶典。
  classUnlockSync(false);
  if(!suppressRender) save();

  if(fxPoint){
    if(fx>0) floatFx("+"+fx+" XP", fxPoint.x, fxPoint.y, "var(--xp)");
    if(fg>0) floatFx("+"+fg+" 金", fxPoint.x + 24, fxPoint.y + 18, "var(--gold)");
  }
  if(ups){ levelUpFx(s.name+" 升至 Lv."+s.level+"!"); sfx("levelup"); }
  else sfx("award");
  if(s.autoPilot) setTimeout(()=> runAutoPilot(sid, true), 60);   // 🤖 託管:得到資源後自動運用
  if(!suppressRender) render();
}
/* ══ 🎁 教師一次性獎勵卡 ═══════════════════════════ */
let rewardCardCreateBusy=false;
function rewardCode(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part=()=>Array.from({length:4},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  let code="";
  do{ code="RPG-"+part()+"-"+part(); }while((state.rewardCards||[]).some(c=>c.code===code));
  return code;
}
function rewardCardLink(code){
  const q = new URLSearchParams(location.search);
  if(CLOUD.cid) q.set("class", CLOUD.cid);
  q.set("reward", code);
  return location.origin + location.pathname + "?" + q.toString();
}
let _rewardQrScanner=null;
function rewardCodeFromQr(raw){
  const text=String(raw||"").trim();
  if(!text)return "";
  try{
    const u=new URL(text,location.href),q=u.searchParams.get("reward")||u.searchParams.get("code")||"";
    if(q)return String(q).trim().toUpperCase();
  }catch(_e){}
  const m=text.toUpperCase().match(/RPG-[A-Z0-9]{4}-[A-Z0-9]{4}/);
  return m?m[0]:text.toUpperCase();
}
function loadRewardScannerLib(done){
  if(window.Html5Qrcode){done(true);return;}
  const old=document.getElementById("rewardScannerLib");
  if(old){old.addEventListener("load",()=>done(!!window.Html5Qrcode),{once:true});old.addEventListener("error",()=>done(false),{once:true});return;}
  const sc=document.createElement("script");sc.id="rewardScannerLib";sc.src="./vendor/html5-qrcode/html5-qrcode.min.js";sc.onload=()=>done(!!window.Html5Qrcode);sc.onerror=()=>done(false);document.head.appendChild(sc);
}
async function stopRewardScanner(){
  const scanner=_rewardQrScanner;_rewardQrScanner=null;
  if(!scanner)return;
  try{await scanner.stop();}catch(_e){}
  try{await scanner.clear();}catch(_e){}
}
function openRewardScanner(sid){
  modalHost.innerHTML='<div class="overlay" id="rewardScanOverlay"><div class="modal" style="max-width:460px;text-align:center"><h3>📷 掃描獎勵卡 QR Code</h3><div id="rewardQrReader" style="width:100%;min-height:260px;background:#111;border-radius:10px;overflow:hidden"></div><div id="rewardScanStatus" class="mini" style="margin:10px 0">正在開啟相機…</div><label class="btn" style="display:inline-block;cursor:pointer">🖼 從照片辨識<input id="rewardQrFile" type="file" accept="image/*" capture="environment" hidden></label> <button class="btn" id="rewardScanClose">關閉</button></div></div>';
  const close=async()=>{await stopRewardScanner();modalHost.innerHTML="";};
  document.getElementById("rewardScanClose").onclick=close;
  document.getElementById("rewardScanOverlay").onclick=e=>{if(e.target.id==="rewardScanOverlay")close();};
  const success=async raw=>{
    const code=rewardCodeFromQr(raw);
    if(!/^RPG-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)){const st=document.getElementById("rewardScanStatus");if(st)st.textContent="這不是本系統的獎勵卡，請重新對準 QR Code。";return;}
    await close();
    const input=document.getElementById("redeemCode");if(input)input.value=code;
    toast("已讀取兌換碼 "+code);
  };
  loadRewardScannerLib(ok=>{
    const status=document.getElementById("rewardScanStatus");if(!status)return;
    if(!ok){status.textContent="掃描元件載入失敗，仍可手動輸入兌換碼。";return;}
    const scanner=new Html5Qrcode("rewardQrReader",{formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE],verbose:false});_rewardQrScanner=scanner;
    scanner.start({facingMode:"environment"},{fps:10,qrbox:(w,h)=>{const n=Math.max(160,Math.min(260,Math.floor(Math.min(w,h)*.72)));return {width:n,height:n};}},success,()=>{})
      .then(()=>{if(document.getElementById("rewardScanStatus"))status.textContent="請將老師的獎勵卡 QR Code 放入框內。";})
      .catch(e=>{if(document.getElementById("rewardScanStatus"))status.textContent="無法開啟相機（請允許相機權限），也可以從照片辨識。";});
    const file=document.getElementById("rewardQrFile");if(file)file.onchange=async()=>{const f=file.files&&file.files[0];if(!f)return;await stopRewardScanner();try{const one=new Html5Qrcode("rewardQrReader");_rewardQrScanner=one;const raw=await one.scanFile(f,true);await success(raw);}catch(e){status.textContent="照片中沒有辨識到 QR Code，請換一張清楚的照片。";}};
  });
}
function grantRewardCardPrize(s, card){
  const title = "兌換獎勵卡「"+(card.title||"神秘獎勵")+"」";
  if(card.xp || card.gold) reward(s.id, +card.xp||0, +card.gold||0, title, null, true);
  const diamondGive=card.diamonds?creditDiamonds(s,+card.diamonds,"reward"):0;
  if(card.itemId){
    s.consumables=s.consumables||{};
    s.consumables[card.itemId]=(s.consumables[card.itemId]||0)+1;
  }
  addLog(s.id, title+(diamondGive?"，另獲得 "+diamondGive+"💎":"")+(card.diamonds&&!diamondGive?"（本週鑽石已達上限）":"")+(card.itemId?"、"+(itemById(card.itemId)||{}).name:""));
  save();
}
async function redeemRewardCard(rawCode, sid){
  const code=String(rawCode||"").trim().toUpperCase();
  if(!code){ toast("請輸入兌換碼", true); return; }
  const s=stu(sid); if(!s) return;
  try{
    let card;
    if(CLOUD.on()){
      const result=await CLOUD.claimRewardCard(code, sid);
      card=(result&&result.card)||result;
      if(result&&result.student){
        const i=state.students.findIndex(x=>String(x.id)===String(sid));
        if(i>=0)state.students[i]=result.student;
        CLOUD._lastSnap["stu:"+sid]=JSON.stringify(result.student);
      }
    }
    else{
      card=(state.rewardCards||[]).find(c=>c.code===code);
      if(!card) throw new Error("找不到此獎勵卡");
      if(!card.active) throw new Error("此獎勵卡已停用");
      if(card.usedBy) throw new Error("這張獎勵卡已被兌換");
      if(card.expiresAt && Date.now()>card.expiresAt) throw new Error("這張獎勵卡已過期");
    }
    const local=(state.rewardCards||[]).find(c=>c.code===code);
    if(local){ local.usedBy=sid; local.usedAt=Date.now(); local.status="used"; }
    if(!CLOUD.on()) grantRewardCardPrize(s, card); // 正式版由 Cloud Function 在同一交易內鎖卡並發獎
    toast("🎉 兌換成功！已領取「"+(card.title||"神秘獎勵")+"」");
    view.tab="bag"; render();
  }catch(e){ toast("無法兌換："+(e.message||e), true); }
}
/* ══ 📣 課堂即時知識挑戰：只有教師端可判定回答並發獎 ══ */

/* ══ 🧭 角色站位答題：題庫網頁未來只需呼叫 ClassRPGQuestionBridge.start(payload) ══ */

let zoneStudentSyncTimer=0,zoneStudentLocalTimer=0;

let zoneCountdownTimer=0;

/* 幾何題自動視覺化：使用內建 SVG，不下載外部圖片，也不接受題庫中的任意 HTML。 */

window.ClassRPGQuestionBridge={
  version:1,
  start(payload){if(CLOUD.on()&&CLOUD.role!=="teacher")throw new Error("只有教師可以送入題目");const q=startZoneLesson(payload);if(typeof render==="function")render();return {ok:true,questionId:q.questionId};},
  schema:{title:"string",prompt:"string",options:["A文字","B文字","C文字","D文字"],correct:"A|B|C|D",xp:15,gold:0}
};
/* 撤回 XP(不足時降級借位;等級最低1) */
function revokeXp(s, amount){
  let need = Math.max(0, Math.round(amount));
  s.totalXp = Math.max(0, s.totalXp - need);
  if(s.xpWeek) s.xpWeek.sum = Math.max(0, (s.xpWeek.sum||0) - need);
  while(need > 0){
    if(s.xp >= need){ s.xp -= need; need = 0; }
    else if(s.level > 1){
      need -= s.xp;
      const lostPts = (s.level===5||s.level===15||s.level===30) ? 2 : 1;   // 該級當初給的自由點
      s.level--; s.spPoints = Math.max(0, s.spPoints-1);
      if(s.level===4 || s.level===14 || s.level===29) s.spPoints = Math.max(0, s.spPoints-2);   // 反向里程碑
      s.statPoints = (s.statPoints||0) - lostPts;
      while(s.statPoints < 0){                                // 點已花掉→從最高自點屬性收回
        if(!s.alloc) s.alloc = {atk:0,agi:0,int:0,def:0};
        const keys = ["atk","agi","int","def"].sort((x,y)=>s.alloc[y]-s.alloc[x]);
        if(s.alloc[keys[0]] > 0){ s.alloc[keys[0]]--; s.statPoints++; }
        else { s.statPoints = 0; }
      }
      const g = JOB_INFO[s.job].growth;
      s.baseAtk-=g.atk; s.baseDef-=g.def; s.baseAgi-=g.agi; s.baseInt-=g.int;
      s.maxHp = Math.max(50, s.maxHp - 10); s.currentHp = Math.min(s.currentHp, s.maxHp);
      s.xp = xpForNextLevel(s.level);
    }else{ s.xp = 0; need = 0; }                             // Lv1 見底
  }
}
function reverseAward(logId){
  const lg = (state.awardLog||[]).find(x=>x.id===logId);
  if(!lg || lg.reverted) return;
  const s = stu(lg.sid); if(!s){ toast("學生已不存在", true); return; }
  revokeXp(s, lg.xp);
  s.gold = Math.max(0, s.gold - lg.gold);
  lg.reverted = true;
  addLog(lg.sid, "⤺ 老師撤回獎勵「"+lg.reason+"」(-"+lg.xp+" XP,-"+lg.gold+" 金)");
  save(); render(); toast("已撤回 "+s.name+" 的「"+lg.reason+"」");
}
function rewardGroup(groupName, baseXp, baseGold, reason){
  const members = state.students.filter(s=>s.group===groupName);
  if(!members.length){ toast("這一組沒有成員", true); return; }
  for(const m of members) reward(m.id, baseXp, baseGold, reason || (groupName+" 組獎勵"));
  toast(groupName+" 組全員獎勵完成("+members.length+" 人)");
}
/* ── 每日進度閘門:探索→魔王→競技場 ── */
function progToday(){ return new Date().toLocaleDateString("sv"); }   // YYYY-MM-DD
function progCheck(){                                       // 每日重置(任何進度操作前呼叫)
  const pg = state.progression;
  const today = progToday();
  if(pg.date !== today){ pg.date = today; pg.stage = 0; pg.exploreXp = 0; }
  castleTax(today);                                          // 🏰 城主組每日稅收
  peakTax(today);                                            // 🌏 巔峰霸主每日稅收
  siegeAutoCheck(today);                                     // 🏆 週五 20:00 自動公會戰(懶執行)
  return pg;
}
function castleTax(today){
  const c = state.castle;
  if(!c || !c.owner || c.taxDate === today) return;
  const members = state.students.filter(x=>x.group===c.owner);
  if(!members.length){ c.owner=""; return; }                 // 組被刪→城堡空置
  c.taxDate = today;
  members.forEach(st=>{ creditGold(st,15,"榮耀之城稅收",true); });
  addLog("-", "🏰 榮耀之城稅收:城主 "+c.owner+" 組全員 +15 金");
}
/* ═══ 🌏 巔峰之城:全世界共享的一座城(雲端 world/peak;離線=本機模擬)═══ */
const PEAK = {
  doc(){ return FB.db.collection("world").doc("peak"); },
  isOurs(){                                                   // 本班是否為現任霸主
    const o = (state.worldPeak||{}).owner || {};
    if(CLOUD.on()) return o.cid && o.cid === CLOUD.cid;
    return o.cid === "" && o.group && state.groups.includes(o.group);   // 離線:本機佔領
  },
  async refresh(){                                            // 登入後拉最新
    if(!CLOUD.on()) return state.worldPeak;
    try{
      const d = await this.doc().get();
      if(d.exists){ state.worldPeak = d.data(); save(); }
      else{ await this.doc().set(state.worldPeak); }
      try{ localStorage.setItem("rpg-world-peak", JSON.stringify(state.worldPeak)); }catch(_){}
    }catch(e){ console.warn("peak refresh", e); }
    return state.worldPeak;
  },
  async claim(data, expected){                                // 佔領:雲端以交易鎖定,避免兩班同時奪城覆寫
    if(!CLOUD.on()){
      state.worldPeak = data; save();
      try{ localStorage.setItem("rpg-world-peak", JSON.stringify(data)); }catch(_){}
      return {ok:true};
    }
    try{
      const result = await FB.db.runTransaction(async tx=>{
        const ref = this.doc(), snap = await tx.get(ref);
        const current = snap.exists ? snap.data() : {};
        const owner = current.owner || {};
        const expectedOwner = (expected&&expected.owner) || {};
        const matches = !expected || (
          (owner.cid||"") === (expectedOwner.cid||"") &&
          (owner.group||"") === (expectedOwner.group||"") &&
          (current.since||"") === (expected.since||"")
        );
        if(!matches) return {ok:false, current};
        tx.set(ref, data);
        return {ok:true, current:data};
      });
      if(!result.ok){
        state.worldPeak = result.current || state.worldPeak; save();
        try{ localStorage.setItem("rpg-world-peak", JSON.stringify(state.worldPeak)); }catch(_){}
        return {ok:false, contested:true};
      }
      state.worldPeak = data; save();
      try{ localStorage.setItem("rpg-world-peak", JSON.stringify(data)); }catch(_){}
      return {ok:true};
    }catch(e){ toast("巔峰之城雲端同步失敗:"+(e.message||e), true); return {ok:false, error:e}; }
  },
  npcDefenders(){                                             // 內建 NPC 守軍(離線/初始)
    // 初始霸主負責展示世界城堡的傳說套裝；每人僅穿一套，戰力仍沿用原守軍數值。
    const troop = [
      ["團長","Warrior",{weaponId:25},"abyss_dark_knight"],
      ["狂戰","Warrior",{weaponId:43},"abyss_dark_knight"],
      ["冰法","Mage",   {weaponId:28},"elemental_dragon_mage"],
      ["星術","Mage",   {weaponId:44},"star_archmage"],
      ["影刺","Rogue",  {weaponId:45},"shadow_hunter"],
      ["聖女","Cleric", {weaponId:46},"skywing_templar"]
    ];
    return troop.map(j=>({ name:"傭兵·"+j[0], job:j[1], level:12, equipment:j[2], legendSetId:j[3],
        skills: j[1]==="Mage"?{frost:3,freeze:2,meteor:2,blizzard:2}:(j[1]==="Warrior"?{slash:2,harden:2,bash:3}:(j[1]==="Rogue"?{poison:3,expose:2,shadow:2}:{heal:3,groupheal:2,shield:2,revive:1})),
        alloc:{atk:2,agi:2,int:2,def:2} }));
  },
  makeTempStudents(snapshot){                                 // 守軍快照 → 臨時角色(id 前綴 PK_,戰後移除)
    const list = (snapshot && snapshot.length) ? snapshot : this.npcDefenders();
    return list.slice(0,6).map((m,i)=>{
      const s = newStudent("PK_"+i, m.name||("守軍"+(i+1)), JOB_INFO[m.job]?m.job:"Warrior", "🌏守軍");
      s.level = Math.max(1, Math.min(60, m.level||12));
      const gr = JOB_INFO[s.job].growth;
      for(let L=2; L<=s.level; L++){ s.baseAtk+=gr.atk; s.baseDef+=gr.def; s.baseAgi+=gr.agi; s.baseInt+=gr.int; s.maxHp+=10; }
      s.currentHp = s.maxHp;
      s.skills = m.skills||{}; s.alloc = Object.assign({atk:0,agi:0,int:0,def:0}, m.alloc||{});
      // 舊版已建立的初始守軍快照沒有 equipment 時，也補回內建職業配置。
      const builtIn = this.npcDefenders().find(n=>n.name===m.name && n.job===m.job);
      const gear = m.equipment || (builtIn&&builtIn.equipment) || {};
      EQUIP_SLOTS.forEach(slot=>{ const it=itemById(gear[slot+"Id"]); if(it && it.type===slot) s[slot+"Id"] = it.id; });
      const legendId=m.legendSetId||(builtIn&&builtIn.legendSetId);
      if(legendSetInfo(legendId)){ s.legendSets={[legendId]:true}; s.legendSetId=legendId; }
      state.students.push(s);
      return s.id;
    });
  },
  snapshotGroup(grp){                                         // 佔領後上傳我方守軍快照
    return state.students.filter(x=>x.group===grp && !String(x.id).startsWith("PK_")).slice(0,6)
      .map(m=>({ name:maskName(m.name), job:m.job, level:m.level, skills:m.skills||{}, alloc:m.alloc||{}, legendSetId:legendSetInfo(m.legendSetId)?m.legendSetId:null,
        equipment:EQUIP_SLOTS.reduce((out,slot)=>{ const it=itemById(m[slot+"Id"]); if(it && it.type===slot) out[slot+"Id"]=it.id; return out; },{}) }));   // 🔒 跨班守軍:遮罩名+公開穿戴
  },
  cleanupTemp(){ state.students = state.students.filter(x=>!String(x.id).startsWith("PK_")); }
};
function peakTax(today){                                      // 🌏 巔峰霸主每日稅收
  if(!PEAK.isOurs()) return;
  if(state.peakTaxDate === today) return;
  const grp = state.worldPeak.owner.group;
  const members = state.students.filter(x=>x.group===grp);
  if(!members.length) return;
  state.peakTaxDate = today;
  members.forEach(st=>{ creditGold(st,30,"巔峰之城稅收",true); });
  addLog("-", "🌏 巔峰之城稅收:世界霸主 "+grp+" 組全員 +30 金");
}
function peakStart(grp){                                      // 🌏 發起攻城(消耗巔峰券,AI 攻防觀戰)
  const ld = stu(state.groupLeaders[grp]);
  if(!ld || !(((ld.consumables||{})[32])>0)){ toast("組長沒有 🌏 巔峰券(榮耀之城城主組長可在城堡商店以 500 金購買)", true); return; }
  if(PEAK.isOurs() && state.worldPeak.owner.group===grp){ toast("你們已經是世界霸主了,守好王座吧!", true); return; }
  const atk = state.students.filter(x=>x.group===grp && !String(x.id).startsWith("PK_")).slice(0,6).map(x=>x.id);
  if(!atk.length){ toast("這組沒有成員", true); return; }
  PEAK.cleanupTemp();
  const currentPeak = state.worldPeak || {};
  GARENA.peakExpected = { owner:Object.assign({}, currentPeak.owner||{}), since:currentPeak.since||"" };
  const defIds = PEAK.makeTempStudents((state.worldPeak||{}).defenders);
  ld.consumables[32]--;
  GARENA.peak = true; GARENA.peakGroup = grp;
  garenaStart(atk, defIds, true);                             // 雙方 AI 觀戰(大屏放給全班看)
  garenaLog("🌏 巔峰之城攻防戰:"+grp+" 組 vs "+((state.worldPeak.owner||{}).className||"守軍")+"("+((state.worldPeak.owner||{}).group||"?")+" 組)!");
  save();
}
/* 🏆 每週五 20:00 自動積分循環賽(懶執行:時間到後首次開啟系統時補跑,每場自動錄影) */
function siegeAutoCheck(today, force){
  try{
    if(!force && window._siegeAutoDone) return;              // 每次開啟系統只檢查一次(報名當下不觸發,重新整理後才開打)
    window._siegeAutoDone = true;
    const now = new Date();
    const fri = new Date(now);
    const dow = now.getDay();
    fri.setDate(now.getDate() - ((dow >= 5) ? dow - 5 : dow + 2));   // 最近一個(含今天)的週五
    fri.setHours(20,0,0,0);
    if(!force && now < fri) return;
    const key = force ? ("manual-"+today) : fri.toLocaleDateString("sv");
    state.siege = state.siege || { entries: [] };
    if(state.siege.autoRunKey === key) return;
    const ents = siegeEntriesToday();
    if(ents.length < 2) return;
    state.siege.autoRunKey = key;
    const groups = [...new Set(ents.map(e=>e.group))];
    const scores = {}; groups.forEach(g=> scores[g] = { w:0, k:0 });
    const memberIds = g => state.students.filter(x=>x.group===g && !String(x.id).startsWith("PK_")).slice(0,6).map(x=>x.id);
    GARENA.autoSim = true;                                    // 背景模擬:不受分頁切換中止
    for(let i=0;i<groups.length;i++) for(let j=i+1;j<groups.length;j++){
      const gA = groups[i], gB = groups[j];
      const A = memberIds(gA), B = memberIds(gB);
      if(!A.length || !B.length) continue;
      garenaStart(A, B, true);
      if(GARENA.timer){ clearInterval(GARENA.timer); GARENA.timer = null; }
      if(GARENA.rec) GARENA.rec.mode = "weekly";
      let guard = 0;
      while(!GARENA.over && guard < 800){ guard++; garenaTick(); }
      if(!GARENA.over) garenaEnd("draw", true);
      const fsAll = Object.values(GARENA.fighters);
      scores[gA].k += fsAll.filter(x=>x.team==="red").reduce((s,x)=>s+(x.kills||0),0);
      scores[gB].k += fsAll.filter(x=>x.team==="blue").reduce((s,x)=>s+(x.kills||0),0);
      if(GARENA.winTeam==="red") scores[gA].w++; else if(GARENA.winTeam==="blue") scores[gB].w++;
    }
    const rank = groups.slice().sort((x,y)=> (scores[y].w - scores[x].w) || (scores[y].k - scores[x].k));
    const champ = rank[0];
    state.castle = state.castle || {};
    state.castle.owner = champ; state.castle.since = new Date().toISOString();
    state.students.filter(x=>x.group===champ).forEach(m=>{ grantXp(m, 30); creditGold(m,50,"積分循環賽冠軍",true); });
    groups.filter(g=>g!==champ).forEach(g=> state.students.filter(x=>x.group===g).forEach(m=> grantXp(m, 10)));
    // 🎫 攻城卷已於「報名時」消耗,循環賽多場不再扣除
    GARENA.autoSim = false;
    GARENA.over = false; GARENA.mvp = null; GARENA.active = false;   // 背景模擬結束:不佔用競技場畫面
    const board = rank.map((g,i)=> (i+1)+"位 "+g+"組("+scores[g].w+"勝)").join("・");
    addLog("-", "🏆 每週公會戰(週五20:00)自動開打!"+groups.length+" 組積分循環賽:"+board+" → 冠軍【"+champ+" 組】佔領榮耀之城!冠軍全員 +30XP +50金、參賽 +10XP。📼 各場回放已保存,課堂可觀看。");
    state.siege.entries = [];
    save();
  }catch(e){ GARENA.autoSim = false; console.warn("siegeAuto", e); }
}
function progAddXp(xp){                                     // 探索階段累計全班XP
  const pg = progCheck();
  if(pg.stage !== 0) return;
  pg.exploreXp += xp;
  if(pg.exploreXp >= pg.exploreGoal){
    pg.stage = 1;
    addLog("-", "🗺 今日探索完成!魔王現身了…(累計 "+pg.exploreXp+" XP)");
    levelUpFx("🗺 探索完成!⚔️ 魔王出現!"); sfx("goal");
  }
}
function progBossDown(){                                    // 魔王擊破→解鎖競技場
  const pg = progCheck();
  if(pg.stage === 1){
    pg.stage = 2;
    addLog("-", "🏟 魔王被擊破,競技場開放!");
    setTimeout(()=>{ levelUpFx("🏟 競技場開放!"); }, 1800);
  }
}
function checkClassGoal(){
  const g = state.classGoal;
  if(!g.celebrated && g.progress >= g.target){
    g.celebrated = true;
    addLog("-", "🎉 全班達成共同目標 "+g.target+" XP!");
    levelUpFx("🎉 班級目標達成!");
    sfx("goal");
  }
}

/* ══ 🏫 全班冒險進度：用有效學生人數 × 每人目標 XP 漸進解鎖 ══ */

function classProgressStudents(){
  return (state.students||[]).filter(s=>s && !s.archived);
}
function classProgressCount(){ return Math.max(1,classProgressStudents().length); }
function classEarnedXp(){ return classProgressStudents().reduce((n,s)=>n+Math.max(0,Number(s.totalXp)||0),0); }
function classStageTarget(stage){
  const cfg=state.classUnlocks||{scale:1};
  return Math.round((stage.per||0)*classProgressCount()*Math.max(.25,Math.min(3,Number(cfg.scale)||1)));
}
function classAutoStage(){
  const xp=classEarnedXp(); let found=0;
  CLASS_UNLOCK_STAGES.forEach(st=>{ if(xp>=classStageTarget(st)) found=st.id; });
  return found;
}
function classEffectiveStage(){
  const cfg=state.classUnlocks||{};
  if(cfg.enabled===false) return CLASS_UNLOCK_STAGES.length-1;
  const permanent=(cfg.celebrated||[]).reduce((m,n)=>Math.max(m,Number(n)||0),0);
  return Math.max(classAutoStage(),permanent,Math.max(0,Number(cfg.manualStage)||0));
}
function classFeatureStage(feature){
  const st=CLASS_UNLOCK_STAGES.find(x=>(x.features||[]).includes(feature));
  return st ? st.id : 0;
}
function classFeatureUnlocked(feature){
  if(classEffectiveStage()<classFeatureStage(feature))return false;
  const gate=CLASS_FEATURE_GATES[feature];return !gate||!!(((state.classUnlocks||{}).teacherGates||{})[gate]);
}
function classFeatureLockText(feature){
  const st=CLASS_UNLOCK_STAGES[classFeatureStage(feature)]||CLASS_UNLOCK_STAGES[0];
  if(classEffectiveStage()<st.id)return st.icon+" 「"+st.name+"」解鎖：全班累積 "+classStageTarget(st).toLocaleString()+" XP";
  const gate=CLASS_FEATURE_GATES[feature],info=gate&&CLASS_GATE_INFO[gate];return info?info.icon+" 已達 XP 門檻，等待教師確認開放「"+info.name+"」":"已達解鎖門檻";
}

let _classUnlockCelebrationActive=false,_classUnlockCelebrationPending=[],_classUnlockCelebrationTimer=null;
function scheduleClassUnlockCelebration(stages){
  (stages||[]).forEach(st=>{if(st&&!_classUnlockCelebrationPending.some(x=>x.id===st.id))_classUnlockCelebrationPending.push(st);});
  if(_classUnlockCelebrationActive||_classUnlockCelebrationTimer||!_classUnlockCelebrationPending.length)return;
  _classUnlockCelebrationTimer=setTimeout(()=>{_classUnlockCelebrationTimer=null;const batch=_classUnlockCelebrationPending.splice(0);showClassUnlockCelebration(batch);},140);
}
function showClassUnlockCelebration(stages){
  stages=(stages||[]).filter(Boolean);if(!stages.length)return;if(_classUnlockCelebrationActive){scheduleClassUnlockCelebration(stages);return;}
  _classUnlockCelebrationActive=true;const latest=stages[stages.length-1],xp=classEarnedXp(),target=classStageTarget(latest),reduced=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const colors=["#ff5577","#ffd84d","#55d7ff","#9b74ff","#62e18e","#ff8b3d"],positions=[[9,17],[23,10],[40,18],[59,9],[76,18],[91,12],[13,57],[88,54],[28,73],[72,70],[48,63],[5,38],[95,36],[50,5]];
  const fireworks=reduced?"":positions.map((p,i)=>'<div class="class-unlock-firework" style="--x:'+p[0]+'%;--y:'+p[1]+'%;--delay:-'+(i*.31).toFixed(2)+'s;--fx:'+colors[i%colors.length]+'">'+Array.from({length:10},(_,n)=>'<i style="--angle:'+(n*36)+'deg;--dist:-'+(42+(i+n)%5*9)+'px"></i>').join("")+'</div>').join("");
  const confetti=reduced?"":Array.from({length:34},(_,i)=>'<i class="class-unlock-confetti" style="--x:'+((i*29)%101)+'%;--cc:'+colors[i%colors.length]+';--dur:'+(4.8+(i%7)*.42)+'s;--delay:-'+((i%11)*.47)+'s"></i>').join("");
  const featureSet=[];stages.forEach(st=>(st.features||[]).forEach(f=>{const name=CLASS_FEATURE_LABELS[f]||f;if(!featureSet.includes(name))featureSet.push(name);}));
  const gated=stages.some(st=>(st.features||[]).some(f=>CLASS_FEATURE_GATES[f]));
  const el=document.createElement("div");el.id="classUnlockCelebration";el.className="class-unlock-celebration"+(reduced?" reduced":"");el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","全班功能解鎖慶祝");
  el.innerHTML='<div class="class-unlock-rays"></div>'+fireworks+confetti+'<div class="class-unlock-card"><div class="class-unlock-ribbon">🎉 全班成就達成 🎉</div><div class="class-unlock-icon">'+latest.icon+'</div><h2>'+esc(latest.name)+' 解鎖！</h2><div class="class-unlock-stage">全班冒險進度・第 '+latest.id+' 階段</div><div class="class-unlock-desc">'+esc(latest.desc)+'</div><div class="class-unlock-features">'+featureSet.map(x=>'<span>✨ '+esc(x)+'</span>').join("")+'</div><div class="class-unlock-progress-note">全班累積 '+xp.toLocaleString()+' XP・達成門檻 '+target.toLocaleString()+' XP</div>'+(gated?'<div class="class-unlock-safety">高互動功能仍需教師在安全閘門個別開啟</div>':'<div class="class-unlock-safety">每位同學的學習成果都推動了這次解鎖</div>')+'<button class="btn class-unlock-close" id="classUnlockClose" disabled>煙火慶祝中・10 秒</button></div>';
  document.body.appendChild(el);sfx("goal");const btn=document.getElementById("classUnlockClose"),started=Date.now();let ticker=null,autoClose=null,unlockClose=null;
  const close=()=>{if(Date.now()-started<CLASS_UNLOCK_CELEBRATION_MIN_MS)return;clearInterval(ticker);clearTimeout(autoClose);clearTimeout(unlockClose);el.remove();_classUnlockCelebrationActive=false;if(_classUnlockCelebrationPending.length)setTimeout(()=>scheduleClassUnlockCelebration([]),260);};
  ticker=setInterval(()=>{const left=Math.max(0,Math.ceil((CLASS_UNLOCK_CELEBRATION_MIN_MS-(Date.now()-started))/1000));if(btn&&left>0)btn.textContent="煙火慶祝中・"+left+" 秒";},250);
  unlockClose=setTimeout(()=>{if(btn){btn.disabled=false;btn.textContent="繼續全班冒險";btn.onclick=close;}},CLASS_UNLOCK_CELEBRATION_MIN_MS);
  autoClose=setTimeout(close,CLASS_UNLOCK_CELEBRATION_TOTAL_MS);
}
function classUnlockSync(silent){
  const cfg=state.classUnlocks; if(!cfg || cfg.enabled===false) return;
  if(CLOUD.on()&&CLOUD.role==="student")return; // 由教師端統一寫入解鎖紀錄與播放班級慶典
  const auto=classAutoStage(),newStages=[]; let newest=null;
  for(let i=1;i<=auto;i++){
    if(!cfg.celebrated.includes(i)){
      cfg.celebrated.push(i); newest=CLASS_UNLOCK_STAGES[i];newStages.push(newest);
      addLog("-","🔓 全班冒險進度解鎖「"+newest.name+"」："+newest.desc);
    }
  }
  if(newest && !silent)scheduleClassUnlockCelebration(newStages);
}
function classProgressHtml(compact){
  const xp=classEarnedXp(), auto=classAutoStage(), effective=classEffectiveStage();
  const current=CLASS_UNLOCK_STAGES[effective], next=CLASS_UNLOCK_STAGES[auto+1]||null;
  const from=classStageTarget(CLASS_UNLOCK_STAGES[auto]);
  const target=next?classStageTarget(next):Math.max(1,xp);
  const pct=next?Math.max(0,Math.min(100,Math.round((xp-from)/Math.max(1,target-from)*100))):100;
  const permanent=((state.classUnlocks||{}).celebrated||[]).reduce((m,n)=>Math.max(m,Number(n)||0),0);
  const manual=(Number((state.classUnlocks||{}).manualStage)||0)>Math.max(auto,permanent)?'・教師已提前開放至 '+current.name:(permanent>auto?'・已永久解鎖':'');
  return '<div class="class-progress'+(compact?' compact':'')+'"><div class="class-progress-head"><div class="class-progress-title">🏫 全班冒險進度・'+current.icon+' '+esc(current.name)+'</div><b class="num">'+xp.toLocaleString()+' XP</b></div>'
    +'<div class="class-progress-track"><div class="class-progress-fill" style="width:'+pct+'%"></div></div>'
    +'<div class="mini">'+(next?'下一階段：'+next.icon+' <b>'+esc(next.name)+'</b>・還差 <b class="num">'+Math.max(0,target-xp).toLocaleString()+' XP</b>（門檻 '+target.toLocaleString()+'）':'🎉 所有班級功能都已解鎖')+manual+'</div></div>';
}

/* ── 商店 / 回收 / 道具(同 v1,對照正式版)────────── */
function isGroupLeader(s){ return s && state.groupLeaders && state.groupLeaders[s.group]===s.id; }
/* 完整性維護:清掉指向已離組/已刪除學生的組長;城主組空了就釋出城堡 */
function reconcileLeadersCastle(){
  let changed = false;
  Object.keys(state.groupLeaders||{}).forEach(g=>{
    const lid = state.groupLeaders[g];
    const ld = stu(lid);
    if(!ld || ld.group !== g){ delete state.groupLeaders[g]; changed = true; }   // 組長不存在或已換組→卸任
  });
  if(state.castle && state.castle.owner){
    if(!state.students.some(x=>x.group===state.castle.owner)){                    // 城主組沒人了→城堡空置
      addLog("-", "🏰 "+state.castle.owner+" 組已無成員,榮耀之城回歸無主。");
      state.castle.owner = ""; state.castle.since = ""; changed = true;
    }
  }
  return changed;
}
/* ── 🎒 背包裝備操作 ────────────────────────────── */
const bagSellPrice = (it)=> it&&it.petLegend?0:Math.floor((it&&it.price||0) * 0.5);   // 唯一傳說不可出售
async function runInventoryAction(sid,action,payload){
  const result=await CLOUD.inventoryAction(action,payload||{});if(!result||!result.student)throw new Error("裝備交易結果不完整");
  const i=state.students.findIndex(x=>String(x.id)===String(sid));if(i>=0)state.students[i]=result.student;
  CLOUD._lastSnap["stu:"+sid]=JSON.stringify(result.student);classUnlockSync(false);return result;
}

/* 放進背包;若已滿則自動出售「最舊的一件」騰出空間,回傳處理結果 */
function bagPush(s, itemId){
  if(!Array.isArray(s.bagItems)) s.bagItems = [];
  const it = itemById(itemId);
  if(!it || it.price<=0) return {sold:false, gold:0};
  if(s.bagItems.length >= BAG_MAX){
    // 🏆 優先擠掉「非傳說/非稀有」的最舊一件,保護背包裡的珍貴裝備不被誤賣
    const isPrecious = (id)=>{ const x = itemById(id); return x && (x.rarity==="Legendary" || x.rarity==="Rare"); };
    let idx = s.bagItems.findIndex(id => !isPrecious(id));
    if(idx < 0) idx = 0;                                          // 萬一整包都是珍貴裝備,才退而求其次擠最舊的
    const oldestId = s.bagItems.splice(idx, 1)[0];
    const oldest = itemById(oldestId);
    const g = oldest ? bagSellPrice(oldest) : 0;
    s.gold += g;
    s.bagItems.push(itemId);
    return {sold:true, gold:g, soldName:(oldest||{}).name||"?"};
  }
  s.bagItems.push(itemId);
  return {sold:false, gold:0};
}
/* 從背包取出裝備穿上;原本穿的那件換回背包 */
async function bagEquip(sid, idx){
  const s = stu(sid); if(!s || !Array.isArray(s.bagItems)) return;
  const itemId = s.bagItems[idx]; const it = itemById(itemId);
  if(!it || it.type==="consumable") return;
  if(CLOUD.on()&&CLOUD.role==="student"){
    try{const r=await runInventoryAction(sid,"bagEquip",{itemId,index:idx});toast(r.message||"已穿戴裝備");sfx("buy");render();}catch(e){toast("裝備失敗："+(e.message||e),true);}return;
  }
  s.bagItems.splice(idx,1);
  const slotKey = it.type + "Id";
  const old = itemById(s[slotKey]);
  s[slotKey] = it.id;
  if(old && old.price>0){
    const r = bagPush(s, old.id);
    addLog(sid, "從背包裝上「"+it.name+"」,換下「"+old.name+"」"+(r.sold?"(背包已滿,自動出售 +"+r.gold+"金)":"收進背包"));
  }else{
    addLog(sid, "從背包裝上「"+it.name+"」");
  }
  save(); render();
}
/* 賣掉背包裡的裝備 */
async function bagSell(sid, idx){
  const s = stu(sid); if(!s || !Array.isArray(s.bagItems)) return;
  const it = itemById(s.bagItems[idx]); if(!it) return;
  if(it.petLegend){toast("唯一傳說裝備不能出售",true);return;}
  if(CLOUD.on()&&CLOUD.role==="student"){
    try{const r=await runInventoryAction(sid,"bagSell",{itemId:it.id,index:idx});toast(r.message||"已出售裝備");render();}catch(e){toast("出售失敗："+(e.message||e),true);}return;
  }
  const g = bagSellPrice(it);
  s.bagItems.splice(idx,1);
  s.gold += g;
  addLog(sid, "賣掉背包中的「"+it.name+"」,獲得 "+g+" 金幣");
  toast("賣出「"+it.name+"」+"+g+"金");
  save(); render();
}
/* ══ 🤖 角色託管(Auto-Pilot)══════════════════════════
   學生開啟後,系統自動:①分配能力點(依職業主屬性)②點技能 ③買裝備 ④組長補攻城卷
   ⚠️ 絕不動鑽石(那是感謝/指導得來的珍貴資源,留給學生自己決定)
   ⚠️ 保留 AUTO_KEEP_GOLD_RATIO 比例的金幣,避免學生想自己買時沒錢 */
          // 保留兩成金幣不花

function autoFeatureReady(feature){return classFeatureUnlocked(feature);}
function autoPilotLockedFeatures(){return Object.entries(AUTO_PILOT_FEATURES).filter(([feature])=>!autoFeatureReady(feature)).map(([,label])=>label);}
function autoPilotFeatureLine(feature,text){return (autoFeatureReady(feature)?"✅ ":"🔒 ")+text+(autoFeatureReady(feature)?"":"（尚未解鎖，託管不會使用）");}

/* 依職業決定能力點配置權重:主屬性 60%、副屬性 40% */

function autoAllocStats(s){
  if(!autoFeatureReady("stats"))return 0;
  let n = 0;
  const main = mainStatOf(s), sub = AUTO_SUB_STAT[s.job] || "def";
  s.alloc = s.alloc || {atk:0, agi:0, int:0, def:0};
  while((s.statPoints||0) > 0){
    // 主副 3:2 輪流,讓角色有主軸也不會太脆
    const preferred=(n%5<3)?main:sub;
    const key=[preferred,main,sub,'atk','def','agi','int'].find(k=>totalStats(s)[k]<STAT_CAP);
    if(!key) break;                                         // 四項都到 200 時保留剩餘點數，不再無限迴圈
    s.alloc[key] = (s.alloc[key]||0) + 1;
    s.statPoints--;
    n++;
  }
  return n;
}
/* 託管流派：一條分支完整升完才轉投下一條，避免每項技能都只點一點而沒有戰術特色。 */

function autoBuildLabel(s){
  const b=(AUTO_SKILL_BUILD[s.job]||[])[0];
  return ((SKILL_BRANCHES[s.job]||[]).find(x=>x[0]===b)||['','專精'])[1].replace(/^.+? /,'');
}
/* 自動點技能：同一「轉職階段 × 流派」由第一招開始連續點滿；滿了才換下一系列。 */
function autoLevelSkills(s){
  if(!autoFeatureReady("skills")||!skillsEnabled()) return 0;
  let n = 0, guard = 0;
  const build=AUTO_SKILL_BUILD[s.job] || [];
  while((s.spPoints||0) > 0 && guard++ < 200){
    const pickable=skillList(s.job).filter(sk=>canLevelSkill(s,sk));
    if(!pickable.length) break;
    const highestTier=skillTierUnlocked(s,3)?3:(skillTierUnlocked(s,2)?2:1);
    const tierChoices=pickable.filter(sk=>(sk.tier||1)===highestTier);
    const pool=tierChoices.length?tierChoices:pickable;
    const ordered=pool.slice().sort((a,b)=>{
      const ba=build.indexOf(a.branch), bb=build.indexOf(b.branch);
      if(ba!==bb) return (ba<0?99:ba)-(bb<0?99:bb);      // 先主流派，再第二、第三流派
      if(a.pos!==b.pos) return a.pos-b.pos;              // 同流派先由第一招往下
      return skillLv(s,a.id)-skillLv(s,b.id);            // 同招連續升到 Lv.5
    });
    const sk=ordered[0];
    s.skills[sk.id]=skillLv(s,sk.id)+1;
    s.spPoints--; n++;
  }
  return n;
}
/* 自動買裝備:每個空著或可升級的部位,只買符合職業定位且買得起的裝備
   ⚠️ 絕不換掉/賣掉傳說裝備(rarity==="Legendary" 或 price===0 的掉落限定品) */

function autoGearScore(job, it){
  const stat = {atk:it.atk||0, agi:it.agi||0, int:it.int||0, def:it.def||0};
  const main = job==="Mage" ? "int" : (job==="Rogue" ? "agi" : (job==="Cleric" ? "int" : "atk"));
  return stat[main]*3 + stat.def + stat.atk + stat.agi + stat.int;
}
function autoBuyGear(s){
  if(!autoFeatureReady("bag")||!autoFeatureReady("shop"))return [];
  const bought = [];
  const budget = ()=> Math.max(0, s.gold - Math.floor(s.gold * AUTO_KEEP_GOLD_RATIO));
  const isLegendary = (it)=> !!it && (it.rarity === "Legendary" || it.price === 0);
  const allowed = AUTO_JOB_GEAR[s.job] || AUTO_JOB_GEAR.Warrior;
  for(const slot of EQUIP_SLOTS){
    const cur = itemById(s[slot+"Id"]);
    if(isLegendary(cur)) continue;                        // 🏆 身上已是傳說裝備→這格完全不碰,跳過
    const curPower = cur ? autoGearScore(s.job,cur) : -1;
    // 候選:同部位、職業可用、買得起、比現有的強，且不會買到掉落限定品。
    const cands = allShopItems()
      .filter(it => it.type===slot && (allowed[slot]||[]).includes(it.id) && it.price>0 && it.price<=budget() && autoGearScore(s.job,it)>curPower)
      .sort((a,b)=> autoGearScore(s.job,b)-autoGearScore(s.job,a) || a.price-b.price);
    if(!cands.length) continue;
    const pick = cands[0];
    const before = s.gold;
    buyItem(s.id, pick.id);                                // 走正規購買流程(含背包/回收邏輯)
    if(s.gold !== before) bought.push(pick.name);          // 確實買成功才記錄
  }
  return bought;
}
/* 組長自動補攻城卷(公會戰報名用) */
function autoBuySiegeTicket(s){
  if(!autoFeatureReady("guild"))return false;
  if(state.groupLeaders[s.group] !== s.id) return false;   // 只有組長需要
  s.consumables = s.consumables || {};
  if((s.consumables[31]||0) > 0) return false;             // 已有就不買
  const ticket = SHOP_ITEMS.find(i=>i.id===31);
  if(!ticket) return false;
  const keep = Math.floor(s.gold * AUTO_KEEP_GOLD_RATIO);
  if(s.gold - ticket.price < keep) return false;           // 買了會低於保留額度→不買
  if(!debitGold(s,ticket.price,"託管購買攻城券"))return false;
  s.consumables[31] = (s.consumables[31]||0) + 1;
  return true;
}
/* 執行一次完整託管;回傳做了哪些事(給提示用) */
function runAutoPilot(sid, silent){
  const s = stu(sid); if(!s || !s.autoPilot) return null;
  const statN = autoAllocStats(s);
  const skillN = autoLevelSkills(s);
  const gear = autoBuyGear(s);
  const ticket = autoBuySiegeTicket(s);
  const did = [];
  if(statN) did.push("分配 "+statN+" 點能力值");
  if(skillN) did.push("點了 "+skillN+" 級技能");
  if(gear.length) did.push("購買 "+gear.join("、"));
  if(ticket) did.push("補了攻城卷");
  if(did.length){
    addLog(sid, "🤖 託管代管:"+did.join("、"));
    save();
    if(!silent) toast("🤖 託管已代管:"+did.join("、"));
  }
  return did;
}

async function buyItem(sid, itemId){
  const s = stu(sid); const it = itemById(itemId);
  if(!s || !it) return;
  if(it.price === 0){ toast("傳說裝備只能靠掉落,無法購買", true); return; }
  if(it.id === 31 && !isGroupLeader(s)){ toast("攻城卷限「組長」購買——想帶隊參戰,先爭取當組長!", true); return; }
  const pay = Math.max(1, Math.round(it.price * (1 - titleEffect(s).shopOff)));   // 稱號折扣
  if(s.gold < pay){ toast("金幣不足:需要 "+pay+",目前 "+s.gold, true); return; }
  if(CLOUD.on()&&CLOUD.role==="student"){
    try{const r=await runInventoryAction(sid,"buy",{itemId:it.id});toast(r.message||("已購買「"+it.name+"」"));sfx("buy");render();}catch(e){toast("購買失敗："+(e.message||e),true);}return;
  }
  debitGold(s,pay,"商店購買");
  if(it.type === "consumable"){
    s.consumables[itemId] = (s.consumables[itemId]||0) + 1;
    addLog(sid, "購買了「"+it.name+"」x1,花費 "+pay+" 金幣");
  }else{
    const slotKey = it.type + "Id";
    const old = itemById(s[slotKey]);
    s[slotKey] = it.id;
    if(old && old.price > 0){                                  // 🎒 換下的舊裝備放進背包(傳說/掉落限定 price=0 不入包)
      const r = bagPush(s, old.id);
      addLog(sid, "購買並裝備「"+it.name+"」,換下的「"+old.name+"」"
        + (r.sold ? "因背包已滿("+BAG_MAX+"件),自動出售獲得 "+r.gold+" 金幣" : "已收進背包"));
    }else{
      addLog(sid, "購買並裝備「"+it.name+"」"+(old?"(替換 "+old.name+")":"")+",花費 "+pay+" 金幣");
    }
    if(it.creatorId && it.creatorId !== sid){
      const cr = stu(it.creatorId);
      if(cr){
        const roy = Math.floor(it.price * 0.1);
        cr.gold += roy;
        addLog(cr.id, "作品「"+it.name+"」被 "+s.name+" 購買,獲得版稅 "+roy+" 金幣");
      }
    }
  }
  unlock(s,"first_buy");
  checkAchievements(s);
  save(); toast("已購買「"+it.name+"」"); sfx("buy"); render();
}
async function recycleSlot(sid, slot){
  const s = stu(sid); if(!s) return;
  const key = slot + "Id";
  const it = itemById(s[key]);
  if(!it){ toast("這個欄位沒有裝備", true); return; }
  if(CLOUD.on()&&CLOUD.role==="student"){
    try{const r=await runInventoryAction(sid,"recycle",{slot});closeModal();toast(r.message||"已回收裝備");render();}catch(e){toast("回收失敗："+(e.message||e),true);}return;
  }
  const refund = Math.floor(it.price * 0.2);
  s[key] = null; s.gold += refund;
  addLog(sid, "回收了「"+it.name+"」,取回 "+refund+" 金幣");
  save(); toast("已回收「"+it.name+"」,+"+refund+" 金幣"); render();
}
function useConsumable(sid, itemId){
  if(itemId === 31){ toast("攻城卷請在「公會戰」頁面按報名使用(報名即消耗一張,本週循環賽全場通行)", true); return; }
  const s = stu(sid); const it = itemById(itemId);
  if(!s || !it || !(s.consumables[itemId]>0)) return;
  s.consumables[itemId]--;
  if(s.consumables[itemId]<=0) delete s.consumables[itemId];
  const refund = ()=>{ s.consumables[itemId] = (s.consumables[itemId]||0)+1; save(); };
  if(itemId === 33){                                     // 🎴 寵物卡:隨機四聖獸
    const pid = 1 + Math.floor(Math.random()*4);
    const p = PETS[pid];
    s.pets = s.pets||{}; s.pets[pid] = true;
    if(!s.petId) s.petId = pid;                          // 首隻自動裝備
    addLog(sid, "🎴 寵物卡開出【"+p.emoji+" "+p.name+"】!("+p.desc+")");
    levelUpFx(p.emoji+" 獲得神獸 "+p.name+"!");
    sfx("goal"); save(); render(); return;
  }
  if(itemId === 34){                                     // 🌠 流星卡:自訂職業名
    modalPrompt("🌠 傳說轉生\n為你的角色取一個專屬職業名號\n(例:劍聖、星隕法皇、追風刺客)", s.customJobName||"", (v)=>{
      if(!v){ refund(); toast("已取消,流星卡退回背包"); render(); return; }
      s.customJobName = v.slice(0,8);
      addLog(sid, "🌠 傳說轉生:職業名號改為「"+s.customJobName+"」");
      levelUpFx("🌠 "+s.name+" 轉生為【"+s.customJobName+"】!");
      save(); render();
    }, 8);
    save(); return;
  }
  if(itemId === 35){                                     // 📝 改名卡:送出申請,老師審核後生效
    modalPrompt("📝 申請更改角色名字\n(送出後由老師審核,通過才會改名)", s.name, (v)=>{
      if(!v){ refund(); toast("已取消,改名卡退回背包"); render(); return; }
      state.renameReq = state.renameReq || [];
      state.renameReq.push({ id: Date.now()+"-"+Math.floor(Math.random()*1e4), sid: sid,
        oldName: s.name, newName: v.slice(0,10), t: new Date().toLocaleString("sv").slice(5,16), status: "pending" });
      addLog(sid, "📝 送出改名申請:「"+s.name+"」→「"+v.slice(0,10)+"」(待老師審核)");
      save(); toast("📝 改名申請已送出,等老師審核通過就會生效"); render();
    }, 10);
    save(); return;
  }
  if(itemId === 36){                                     // 🔄 轉職卡:選新職業重算成長+重置技能
    const jobs = JOB_LIST().filter(j=>j!==s.job);              // 🔄 轉職選單:自動涵蓋未來新職業
    modalHost.innerHTML = '<div class="overlay" id="ovlJ"><div class="modal" style="max-width:420px;text-align:center">'
      + '<div style="font-weight:900;margin-bottom:10px">🔄 選擇新職業(等級保留,技能點全數退還重配)</div>'
      + '<div class="inline-form" style="justify-content:center">'
      + jobs.map(j=>'<button class="btn" data-jb="'+j+'">'+JOB_INFO[j].emoji+' '+JOB_INFO[j].name+'</button>').join("")
      + '<button class="btn" id="jbNo">取消</button></div></div></div>';
    document.getElementById("jbNo").onclick = ()=>{ modalHost.innerHTML=""; refund(); toast("已取消,轉職卡退回背包"); render(); };
    modalHost.querySelectorAll("[data-jb]").forEach(b=> b.onclick = ()=>{
      const nj = b.dataset.jb; modalHost.innerHTML="";
      const spent = spSpent(s);
      s.job = nj; s.skills = {}; s.spPoints += spent;      // 技能點退還
      s.baseAtk=10; s.baseAgi=10; s.baseInt=10; s.baseDef=10;
      const gr = JOB_INFO[nj].growth;
      for(let L=2; L<=s.level; L++){ s.baseAtk+=gr.atk; s.baseDef+=gr.def; s.baseAgi+=gr.agi; s.baseInt+=gr.int; }
      addLog(sid, "🔄 轉職為【"+JOB_INFO[nj].name+"】(Lv."+s.level+" 成長已重算,技能點退還 "+spent+")");
      levelUpFx("🔄 "+s.name+" 轉職為 "+JOB_INFO[nj].name+"!");
      save(); render();
    });
    save(); return;
  }
  if(itemId === 12){
    const before = s.currentHp;
    s.currentHp = Math.min(s.maxHp, s.currentHp + 30);
    addLog(sid, "使用「回復藥水」,回復 "+(s.currentHp-before)+" HP");
  }else if(itemId === 24){
    const refunded = spSpent(s);
    s.spPoints += refunded; s.skills = {};
    addLog(sid, "使用「洗技藥水」,重置技能點,退還 "+refunded+" SP");
  }else{
    addLog(sid, "使用「"+it.name+"」("+it.effect+";測試版僅記錄,不套用加成)");
  }
  save(); toast("已使用「"+it.name+"」"); render();
}

/* ── 任務系統 ─────────────────────────────────────── */
function createTask(title, xp, gold, scope){
  const t = { id: state.nextTaskId++, title, xp, gold, scope, active:true, reviewMode:"teacher", leaderDelayHours:24, autoRule:"level", autoTarget:1 };
  state.tasks.unshift(t);
  addLog("-", "老師發布任務「"+title+"」(+"+xp+" XP,+"+gold+" 金)");
  save(); return t;
}

function taskCategoryInfo(t){ return TASK_CATEGORIES[(t&&t.category)||"lesson"] || TASK_CATEGORIES.lesson; }
function taskById(id){ return state.tasks.find(t=>t.id===id); }
/* 任務獎勵:三層任務依 tier(0基礎/1進階/2挑戰)取,單一任務用本身 xp/gold */
function taskReward(t, tier){
  if(t.tiers && t.tiers[tier]) return t.tiers[tier];
  return {name:"", xp:t.xp, gold:t.gold};
}

function peerReviewDiamondEvery(){return Math.max(5,Math.min(100,Number(economyCfg().peerReviewDiamondEvery)||20));}
function peerReviewWeeklyGemMax(){return Math.max(0,Math.min(5,Number(economyCfg().peerReviewWeeklyDiamondCap)||1));}
function classCareStatus(){
  const week=lbWeekKey();state.care=state.care||{week:"",points:0,unique:{}};if(state.care.week!==week)state.care={week,points:0,unique:{}};
  state.care.unique=state.care.unique||{};state.care.points=Object.keys(state.care.unique).length;
  return {points:state.care.points,target:Math.max(5,Math.ceil(classProgressStudents().length*.7)),week};
}
function recordClassCare(from,to){const c=classCareStatus(),key=String(from)+">"+String(to);if(!state.care.unique[key])state.care.unique[key]=Date.now();state.care.points=Object.keys(state.care.unique).length;return c;}
function taskReviewMode(t){ return TASK_REVIEW_MODES[(t&&t.reviewMode)||"teacher"] ? ((t&&t.reviewMode)||"teacher") : "teacher"; }
function taskReviewInfo(t){ return TASK_REVIEW_MODES[taskReviewMode(t)]; }
function taskAutoValue(s,rule){
  if(!s) return 0;
  if(rule==="level") return Number(s.level)||0;
  if(rule==="totalXp") return Number(s.totalXp)||0;
  if(rule==="lessonAnswers") return Number(s.lessonAnswers)||0;
  if(rule==="approvedTasks") return approvedCount(s.id);
  if(rule==="thanksTotal") return Number(s.thanksSentTotal)||0;
  if(rule==="dungeonQuestions") return Number((s.dungeonStats||{}).totalQuestions)||0;
  if(rule==="dungeonClears") return Number((s.dungeonStats||{}).clears)||0;
  return 0;
}
function taskAutoStatus(t,s){
  const rule=TASK_AUTO_RULES[t.autoRule] ? t.autoRule : "level", info=TASK_AUTO_RULES[rule];
  const raw=taskAutoValue(s,rule),baseline=Number(t.autoStartValues&&t.autoStartValues[s.id])||0,value=Math.max(0,raw-baseline),target=Math.max(1,Number(t.autoTarget)||1);
  return {rule,info,value,raw,baseline,target,passed:value>=target,text:info.name+" "+value+"／"+target+info.unit};
}
function submissionTime(sub){
  const direct=Number(sub&&sub.submittedAt)||0;
  if(direct) return direct;
  const parsed=Date.parse((sub&&sub.t)||"");
  return Number.isFinite(parsed)?parsed:Date.now();
}
function leaderReviewStats(leader){
  if(!leader.leaderReviewStats) leader.leaderReviewStats={date:"",week:"",count:0,gold:0,gems:0,total:0,diamondProgress:0};
  leader.leaderReviewStats.count=Number(leader.leaderReviewStats.count)||0;
  leader.leaderReviewStats.gold=Number(leader.leaderReviewStats.gold)||0;
  leader.leaderReviewStats.gems=Number(leader.leaderReviewStats.gems)||0;
  leader.leaderReviewStats.total=Number(leader.leaderReviewStats.total)||0;
  leader.leaderReviewStats.diamondProgress=Number(leader.leaderReviewStats.diamondProgress)||0;
  const today=todayStr();
  if(leader.leaderReviewStats.date!==today){
    leader.leaderReviewStats.date=today; leader.leaderReviewStats.count=0;leader.leaderReviewStats.gold=0;
  }
  const week=lbWeekKey();if(leader.leaderReviewStats.week!==week){leader.leaderReviewStats.week=week;leader.leaderReviewStats.gems=0;}
  return leader.leaderReviewStats;
}
function leaderReviewEligible(sub,leader){
  if(!sub || sub.status!=="pending" || !leader || !isGroupLeader(leader)) return false;
  const task=taskById(sub.taskId), author=stu(sub.sid);
  if(!task || taskReviewMode(task)!=="leader" || !author || author.id===leader.id || author.group!==leader.group) return false;
  return Date.now()-submissionTime(sub) >= Math.max(0,Number(task.leaderDelayHours)||0)*3600000;
}
function leaderReviewQueue(leader){
  if(!leader || !isGroupLeader(leader) || leaderReviewStats(leader).count>=TASK_LEADER_DAILY_REVIEW_MAX) return [];
  const seed=todayStr()+"|"+leader.id;
  const score=sub=>{const raw=seed+"|"+sub.taskId+"|"+sub.sid;let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
  return state.submissions.filter(sub=>leaderReviewEligible(sub,leader)).sort((a,b)=>score(a)-score(b));
}
function leaderReadyCount(){
  return Object.values(state.groupLeaders||{}).reduce((n,id)=>n+leaderReviewQueue(stu(id)).length,0);
}
function recordLeaderReview(leader,sub){
  const stats=leaderReviewStats(leader);
  if(sub.leaderReviewCounted) return 0;
  sub.leaderReviewCounted=true; stats.count++; stats.total=(stats.total||0)+1;
  const reviewGold=creditGold(leader,Math.max(0,Number(economyCfg().peerReviewGold)||0),"同儕代審",true);stats.gold+=reviewGold;
  stats.diamondProgress++;
  let gems=0;
  if(stats.diamondProgress>=peerReviewDiamondEvery()&&stats.gems<peerReviewWeeklyGemMax()){
    stats.diamondProgress-=peerReviewDiamondEvery();gems=creditDiamonds(leader,1,"review");stats.gems+=gems;
    addLog(leader.id,"💎 累積完成 "+peerReviewDiamondEvery()+" 件有效同儕代審，獲得 1 顆鑽石（等值 1,000 金）");
  }
  addLog(leader.id,"🤝 完成同組任務代審，獲得 "+reviewGold+" 金幣");
  return gems;
}
function addTaskReviewLog(sub,task,reviewer,decision){
  state.taskReviewLog=state.taskReviewLog||[];
  state.taskReviewLog.unshift({
    id:Date.now()+"-"+Math.floor(Math.random()*10000), taskId:task.id, taskTitle:task.title,
    sid:sub.sid, decision, source:reviewer.type||"teacher", reviewerId:reviewer.id||"teacher",
    reviewedAt:Date.now()
  });
  if(state.taskReviewLog.length>300) state.taskReviewLog=state.taskReviewLog.slice(0,300);
}
function subFor(taskId, sid){ return state.submissions.find(x=>x.taskId===taskId && x.sid===sid); }
function taskScopeHas(t, sid){
  return t.scope && t.scope.indexOf("stu:")===0 && t.scope.slice(4).split(",").includes(sid);
}
function tasksForStudent(s){
  return state.tasks.filter(t=> t.active && (t.scope==="all" || t.scope===s.group || taskScopeHas(t, s.id)));
}
function pendingSubs(){ return state.submissions.filter(x=>x.status==="pending"); }

function pendingHelpRequests(){return (state.helpRequests||[]).filter(x=>x&&x.status==="pending").sort((a,b)=>(Number(a.createdAtMs)||0)-(Number(b.createdAtMs)||0));}
function pendingRenames(){ return (state.renameReq||[]).filter(r=>r.status==="pending"); }
function pendingRealItems(){ return (state.realItemLog||[]).filter(l=>!l.done); }
function reviewCount(){ return pendingHelpRequests().length + pendingSubs().length + pendingDesigns().length + pendingRealItems().length + pendingRenames().length; }
function taskBatchToolbarHtml(){
  return '<div class="task-batch-toolbar"><b>☑ 批次審核</b><button class="btn" data-taskselect="all">全選</button><button class="btn" data-taskselect="none">清空</button><span class="mini task-selected-count">已選 0 件</span><span class="spacer"></span><button class="btn gold" data-task-bulk-approve>✓ 通過已勾選</button></div>';
}
function teacherReview(){
  const helps=pendingHelpRequests();
  const allFeedback=(state.helpRequests||[]).filter(h=>h&&h.status!=="cancelled");
  const helpStats=Object.entries(HELP_REQUEST_OPTIONS).map(([kind,opt])=>{
    const rows=allFeedback.filter(h=>String(h.kind)===kind),pending=rows.filter(h=>h.status==="pending").length,resolved=rows.filter(h=>h.status==="resolved").length;
    return '<tr><td>'+opt.icon+' <b>'+esc(opt.label)+'</b></td><td class="num">'+pending+'</td><td class="num">'+resolved+'</td><td class="num">'+rows.length+'</td></tr>';
  }).join("");
  const helpRows=helps.map(h=>'<tr><td>'+esc(h.studentName||((stu(h.sid)||{}).name)||"學生")+'</td><td>'+esc(h.group||((stu(h.sid)||{}).group)||"")+' 組</td><td><b>'+esc((HELP_REQUEST_OPTIONS[h.kind]||{}).label||h.category||"學習回饋")+'</b><div class="mini">'+new Date(Number(h.createdAtMs)||Date.now()).toLocaleString("zh-TW",{hour12:false})+'・內容只有教師可見</div></td><td><button class="btn gold" data-helpdone="'+esc(h.id)+'">✓ 已關心處理</button></td></tr>').join("")||'<tr><td colspan="4" class="mini">目前沒有待處理的學習回饋</td></tr>';
  // ① 任務批改
  const subs = pendingSubs();
  const subRows = subs.slice(0,40).map(x=>{
    const t = state.tasks.find(k=>k.id===x.taskId), st = stu(x.sid);
    if(!t || !st) return "";
    const ri=taskReviewInfo(t);
    const dr=x.dungeonResult,drText=dr?'<div class="mini">🏰 本次答對 '+(Number(dr.correct)||0)+'／'+(Number(dr.questions)||0)+' 題・通關 '+(Number(dr.zoneClears)||0)+'・最高 '+(Number(dr.bestChain)||0)+' 連擊</div>':'';
    return '<tr><td style="width:34px"><input type="checkbox" class="task-review-check" value="'+x.taskId+'|'+x.sid+'" aria-label="選取 '+esc(st.name)+' 的任務"></td><td>'+esc(st.name)+'</td><td>'+esc(t.title)+(t.tiers?'('+TIER_NAMES[x.tier||0]+')':'')+'<div class="mini">'+ri.icon+ri.name+'</div>'+drText+'</td>'
      + '<td><button class="btn gold" data-rvsub="'+x.sid+'|'+x.taskId+'|ok" style="padding:2px 10px;font-size:12px">✓ 通過</button> '
      + '<button class="btn danger" data-rvsub="'+x.sid+'|'+x.taskId+'|no" style="padding:2px 10px;font-size:12px">✕ 退回</button></td></tr>';
  }).join("") || '<tr><td colspan="4" class="mini">沒有待批改的任務</td></tr>';
  // ② 工坊設計
  const designs = pendingDesigns();
  const dsRows = designs.slice(0,40).map(c=>{
    const st = stu(c.creatorId);
    return '<tr><td>'+esc((st||{name:"?"}).name)+'</td><td>'+customThumb(c,26)+' '+esc(c.name)+'</td>'
      + '<td><button class="btn gold" data-rvds="'+c.id+'|ok" style="padding:2px 10px;font-size:12px">✓ 上架</button> '
      + '<button class="btn danger" data-rvds="'+c.id+'|no" style="padding:2px 10px;font-size:12px">✕ 退回</button></td></tr>';
  }).join("") || '<tr><td colspan="3" class="mini">沒有待審的學生創作</td></tr>';
  // ③ 道具卡執行
  const items = pendingRealItems();
  const itRows = items.slice(0,40).map(lg=>
    '<tr><td class="mini num">'+esc(lg.t)+'</td><td>'+esc(lg.itemName)+'</td><td>'+esc(lg.byName)+' → <b>'+esc(lg.forName)+'</b></td>'
    + '<td><button class="btn gold" data-csdone="'+lg.id+'" style="padding:2px 10px;font-size:12px">✓ 執行</button></td></tr>').join("")
    || '<tr><td colspan="4" class="mini">沒有待執行的道具卡</td></tr>';
  // ④ 改名申請
  const rns = pendingRenames();
  const rnRows = rns.map(r=>'<tr><td class="mini num">'+esc(r.t)+'</td><td>'+esc(r.oldName)+' → <b>'+esc(r.newName)+'</b></td>'
    + '<td><button class="btn gold" data-rnok="'+r.id+'" style="padding:2px 10px;font-size:12px">✓ 通過</button> '
    + '<button class="btn danger" data-rnno="'+r.id+'" style="padding:2px 10px;font-size:12px">✕ 退回</button></td></tr>').join("")
    || '<tr><td colspan="3" class="mini">沒有待審的改名申請</td></tr>';
  const badge = n => n ? ' <span class="tag" style="background:#c0392b;color:#fff">'+n+'</span>' : '';
  return '<div class="panel"><h3>✅ 審核中心 <span class="mini">(所有需要老師確認的項目都集中在這裡)</span></h3>'
    + '<div class="mini" style="margin-bottom:10px">共 <b>'+reviewCount()+'</b> 件待處理。任務批改與工坊上架也可在各自分頁操作,這裡是統一入口。</div></div>'
    + '<div class="panel" style="border-color:#2b7a57;background:#f0fff7"><h3>🫶 學習回饋統計'+badge(helps.length)+'</h3><div class="mini" style="margin-bottom:8px">此區只有教師可以查看，不公開、不排行，也不扣除班級進度。</div><table class="learning-feedback-stats"><thead><tr><th>回饋類型</th><th>待處理</th><th>已處理</th><th>累計</th></tr></thead><tbody>'+helpStats+'</tbody></table><details open style="margin-top:10px"><summary><b>需要教師處理的個別回饋（'+helps.length+'）</b></summary><table><thead><tr><th>學生</th><th>小組</th><th>回饋類型</th><th></th></tr></thead><tbody>'+helpRows+'</tbody></table></details></div>'
    + '<div class="panel"><h3>📝 學生繳交任務'+badge(subs.length)+'</h3>'+taskBatchToolbarHtml()+'<table><thead><tr><th></th><th>學生</th><th>任務</th><th></th></tr></thead><tbody>'+subRows+'</tbody></table></div>'
    + '<div class="panel"><h3>🎨 學生創作上架'+badge(designs.length)+'</h3><table><thead><tr><th>創作者</th><th>作品</th><th></th></tr></thead><tbody>'+dsRows+'</tbody></table></div>'
    + '<div class="panel"><h3>🎟 道具卡執行'+badge(items.length)+'</h3><table><thead><tr><th>時間</th><th>道具</th><th>使用</th><th></th></tr></thead><tbody>'+itRows+'</tbody></table></div>'
    + '<div class="panel"><h3>📝 改名申請'+badge(rns.length)+'</h3><table><thead><tr><th>時間</th><th>改名</th><th></th></tr></thead><tbody>'+rnRows+'</tbody></table></div>';
}
function approvedCount(sid){ return state.submissions.filter(x=>x.sid===sid && x.status==="approved").length; }
async function submitTask(sid, taskId, tier){
  const s = stu(sid); const t = taskById(taskId);
  if(!s || !t) return;
  tier = t.tiers ? Math.max(0, Math.min(2, tier|0)) : 0;
  const ex = subFor(taskId, sid);
  if(ex && ex.status!=="rejected"){ toast(ex.status==="pending"?"已送出,等老師審核":"這個任務已完成過", true); return; }
  if(taskReviewMode(t)==="auto"){
    const check=taskAutoStatus(t,s);
    if(!check.passed){ toast("尚未達成自動驗證條件："+check.text, true); return; }
  }
  const stamp=Date.now(), stampText=new Date(stamp).toLocaleString("zh-TW",{hour12:false});
  let sub=ex;
  if(sub){ sub.status="pending"; sub.tier=tier; sub.t=stampText; sub.submittedAt=stamp; delete sub.reviewedAt; delete sub.reviewedBy; delete sub.reviewSource; }
  else{ sub={taskId,sid,status:"pending",tier,t:stampText,submittedAt:stamp}; state.submissions.push(sub); }
  if(taskReviewMode(t)==="auto"){
    addLog(sid,"系統驗證任務「"+t.title+"」達標,自動通過");
    await approveSubmission(taskId,sid,{type:"auto",id:"system",name:"系統"});
    toast("⚙️ 條件驗證成功,任務已自動完成!");
    return;
  }
  const wait=taskReviewMode(t)==="leader" ? "等待教師審核；逾時後同組組長可代審" : "等待教師審核";
  addLog(sid,"回報完成任務「"+t.title+"」"+(t.tiers?"("+TIER_NAMES[tier]+")":"")+","+wait);
  if(CLOUD.on()&&CLOUD.role==="student"){
    try{await CLOUD.writeSubmission(sub);save();}
    catch(e){sub.status="rejected";toast("任務回報未送出："+(e.message||e),true);render();return;}
  }else save();
  toast("已回報,"+wait); render();
}
async function approveSubmission(taskId, sid, reviewer){
  taskId=+taskId;
  const sub = subFor(taskId, sid); const t = taskById(taskId); const s = stu(sid);
  if(!sub || !t || !s || sub.status==="approved") return false;
  const rv=reviewer||{type:"teacher",id:"teacher",name:"教師"};
  if(CLOUD.on()){
    try{
      const result=await CLOUD.approveTask(taskId,sid);if(!result)return false;
      const si=state.students.findIndex(x=>String(x.id)===String(sid));if(si>=0&&result.student)state.students[si]=result.student;
      Object.assign(sub,result.submission||{status:"approved"});CLOUD._lastSnap["stu:"+sid]=JSON.stringify(result.student||s);
      if(rv.type==="leader")recordLeaderReview(stu(rv.id),sub);scheduleRender();toast((result.already?"此任務已核發過":"✅ 任務獎勵已由伺服器交易核發"));return !result.already;
    }catch(e){toast("任務審核失敗："+(e.message||e),true);return false;}
  }
  sub.status = "approved";
  sub.reviewedAt=Date.now(); sub.reviewSource=rv.type; sub.reviewedBy=rv.id||rv.name||"teacher";
  addTaskReviewLog(sub,t,rv,"approved");
  let leaderGems=0;
  if(rv.type==="leader"){
    const leader=stu(rv.id);
    if(leader) leaderGems=recordLeaderReview(leader,sub);
  }
  const rw = taskReward(t, sub.tier||0);
  reward(sid, rw.xp, rw.gold, "完成任務「"+t.title+"」"+(t.tiers?"("+TIER_NAMES[sub.tier||0]+")":""), null, true, rv.type==="leader", rv.batch===true);   // 額外任務:不受每日上限
  if(t.titleReward) grantTitle(s, t.titleReward);
  if(approvedCount(sid)>=3) unlock(s,"task3");
  if(rv.type==="leader") addLog(sid,"任務由組長 "+(stu(rv.id)||{name:"?"}).name+" 代審通過");
  if(!rv.batch){ save(); render(); }
  if(CLOUD.on()&&CLOUD.role==="teacher")CLOUD.writeSubmission(sub).catch(e=>toast("任務審核同步失敗："+(e.message||e),true));
  if(leaderGems) toast("🛡️ 代審完成,累積獲得 "+leaderGems+" 顆鑽石!");
  return true;
}
function rejectSubmission(taskId, sid, reviewer){
  taskId=+taskId;
  const sub = subFor(taskId, sid); const t = taskById(taskId);
  if(!sub || sub.status!=="pending") return false;
  const rv=reviewer||{type:"teacher",id:"teacher",name:"教師"};
  sub.status = "rejected";
  sub.reviewedAt=Date.now(); sub.reviewSource=rv.type; sub.reviewedBy=rv.id||rv.name||"teacher";
  if(t) addTaskReviewLog(sub,t,rv,"rejected");
  let leaderGems=0;
  if(rv.type==="leader"){
    const leader=stu(rv.id);
    if(leader) leaderGems=recordLeaderReview(leader,sub);
  }
  addLog(sid, "任務「"+(t?t.title:taskId)+"」未通過審核,可再挑戰");
  if(rv.type==="leader") addLog(sid,"本次由同組組長代審退回,請補充完成後重新回報");
  save(); render();
  if(CLOUD.on()&&CLOUD.role==="teacher")CLOUD.writeSubmission(sub).catch(e=>toast("任務審核同步失敗："+(e.message||e),true));
  if(leaderGems) toast("🛡️ 代審完成,累積獲得 "+leaderGems+" 顆鑽石!");
  return true;
}
async function leaderReviewSubmission(leaderId,taskId,sid,decision){
  taskId=+taskId;
  const leader=stu(leaderId), sub=subFor(taskId,sid);
  if(!leader || !sub || !leaderReviewEligible(sub,leader)){ toast("這筆回報尚未開放組長代審",true); return; }
  const stats=leaderReviewStats(leader);
  if(stats.count>=TASK_LEADER_DAILY_REVIEW_MAX){ toast("今日代審已達 "+TASK_LEADER_DAILY_REVIEW_MAX+" 件上限",true); return; }
  const rv={type:"leader",id:leader.id,name:leader.name};
  if(decision==="approve") await approveSubmission(taskId,sid,rv); else rejectSubmission(taskId,sid,rv);
}

/* ── Boss 戰 ──────────────────────────────────────── */
/* 倍率對照正式版 stats.ts:
 * 傷害 = base × (1+(ATK-10)×0.02);受傷 = base × max(0.2, 1-(DEF-10)×0.02) */
/* 職業主屬性驅動傷害:戰士吃攻擊、遊俠吃敏捷、法師/牧師吃智力 */
function JOB_LIST(){ return Object.keys(JOB_INFO); }        // 🔄 職業清單:一律由 JOB_INFO 動態取得(新職業自動納入)

function mainStatOf(s){ return MAIN_STAT[s.job] || "atk"; }
function dmgMultiplier(s){ const k=mainStatOf(s),x=Math.max(0,totalStats(s)[k]-10); return 1+x/(x+100)*2.5; }
function defMultiplier(s){ const x=Math.max(0,totalStats(s).def-10),reduction=Math.min(.60,x/(x+120)); return 1-reduction; }
function avgPartyLevel(){
  const arr = state.students;
  if(!arr.length) return 1;
  return arr.reduce((a,s)=>a+(s.level||1),0) / arr.length;
}
/* ══ 🐉 四屬性魔王(隨機出現;擊敗後解鎖對應戰場)══
   冰霜→冰原 / 烈焰→火山 / 岩石→旱地 / 風暴→風谷 */
/* 隨機挑一隻(優先未解鎖的,鼓勵集齊四戰場) */
function pickElemBoss(){
  const all = Object.values(ELEM_BOSSES);
  const locked = all.filter(b=> !(state.unlockedMaps||[]).includes(b.map));
  const pool = locked.length ? locked : all;
  return pool[Math.floor(Math.random()*pool.length)];
}
function elemBossImg(key, size){
  const b = ELEM_BOSSES[key]; if(!b) return "";
  return '<img src="data:image/png;base64,'+b.img+'" height="'+(size||130)+'" alt="'+b.name+'" '
    + 'class="boss-sprite" style="--boss:'+b.color+'">';
}
/* 戰場是否已解鎖(平原永久開放) */
function mapUnlocked(k){ return k==="plain" || k==="moba" || (state.unlockedMaps||[]).includes(k); }
function startBoss(name, hp, rXp, rGold, elemKey){
  resetSkillCooldowns('boss');
  const lv = avgPartyLevel();
  const atkBonus = Math.max(0, Math.round((lv - 1) * 1.5));   // 每平均等級 +1.5 攻擊
  // 🐉 未指定屬性時隨機挑一隻屬性魔王(優先未解鎖的戰場)
  const eb = elemKey ? ELEM_BOSSES[elemKey] : pickElemBoss();
  const bossName = name || (eb ? eb.icon+" "+eb.name : "魔王");
  state.boss = { name:bossName, maxHp:hp, hp, rewardXp:rXp, rewardGold:rGold,
    elem: eb ? eb.key : null,                                 // 屬性(決定解鎖哪個戰場)
    damage:{}, groupDamage:{}, weakness:false,
    atkBonus, casting:false, counterHalf:false, frozen:false, poison:null, revivedThisFight:{},
    standby:{}, roundActiveGroup:null, groupBuffs:{} };
  addLog("-", "🐉 Boss「"+bossName+"」出現了!HP "+hp+"(全班平均 Lv"+lv.toFixed(1)+",Boss 攻擊 +"+atkBonus+")"
    + (eb && !mapUnlocked(eb.map) ? " — 擊敗後解鎖【"+eb.icon+" "+eb.mapName+"】戰場!" : ""));
  levelUpFx("🐉 "+bossName+" 出現!"); sfx("chest");
  // 召喚後直接回到大屏並展開浮動戰鬥控制台，避免老師還要切換兩次。
  view.tview = "board";
  view.teacherMenu = false;
  _fcCollapsed = false;
  save();
}
/* 小組四職業齊全 → 該組攻擊 +20%(平衡編組的誘因) */
function groupBalanced(g){
  const jobs = new Set(state.students.filter(s=>s.group===g).map(s=>s.job));
  return ["Warrior","Mage","Rogue","Cleric"].every(j=>jobs.has(j));
}
function attackBoss(sid, fxPoint){
  const b = state.boss; const s = stu(sid);
  if(!b || !s) return;
  if(s.currentHp<=0){ toast(s.name+" 已倒下,需要回復藥水或全員休息", true); return; }
  const on = skillsEnabled();
  tickSkillCooldowns('boss',s.id);
  let mult = dmgMultiplier(s);
  let note = "";
  if(s.job==="Mage") mult *= 1.5;
  if(s.job==="Cleric") mult *= 0.7;
  if(groupBalanced(s.group)){ mult *= 1.2; note += ",小組職業齊全+20%"; }
  // 吃小組光環 buff(戰吼/魔力共鳴的攻擊加成、疾風令的破綻)
  const gb = b.groupBuffs[s.group] || {};
  if(gb.atk){ mult *= (1 + gb.atk); note += ",光環攻擊+"+Math.round(gb.atk*100)+"%"; }
  if(gb.expose){ mult *= 1.3; note += ",疾風破綻!"; }
  if(b.weakness){ const wb = b.exposeBonus || 1.3; mult *= wb; b.weakness = false; b.exposeBonus = 0; note += ",命中破綻!"; }
  const base = 15 + Math.floor(Math.random()*11);
  let dmg = Math.max(1, Math.round(base * mult * advancementDamageMult(s)));
  if(advancementBonus(s,'power')>0) advancementFx(s,'power','[data-charwall="'+s.id+'"]');
  const fxMsgs = [];
  const roll = (id)=> on && rollCombatSkill(s,id,'boss');
  // ── 大招:Lv5解鎖,攻擊時10%機率,每場Boss戰每人一次 ──
  if(!b.ultUsed) b.ultUsed = {};
  if(ultReady(s) && !b.ultUsed[s.id] && Math.random() < 0.10){
    b.ultUsed[s.id] = true;
    const u = ULT_DEFS[s.job] || { name:"全力一擊", mult:2 };     // 🔄 新職業預設大招
    const hits = u.hits || 1;
    let totalU = 0;
    for(let h2=0; h2<hits; h2++){
      const ud = Math.max(1, Math.round((15 + Math.floor(Math.random()*11)) * mult * u.mult));
      totalU += ud;
      setTimeout(()=> dmgPop(ud, '[data-charwall="'+s.id+'"]', "dmg", {maxHp:b.maxHp}), 260*h2 + 420);
    }
    ultFxPlay(s.job, '[data-charwall="'+s.id+'"]');
    if(u.selfHeal){
      const effMaxU = s.maxHp + skillMaxHpBonus(s);
      const uh = Math.min(u.selfHeal, effMaxU - s.currentHp);
      if(uh>0){ s.currentHp += uh; setTimeout(()=> dmgPop(uh, '[data-charwall="'+s.id+'"]', "heal"), 520); }
    }
    b.hp = Math.max(0, b.hp - totalU);
    b.damage[s.id] = (b.damage[s.id]||0) + totalU;
    b.groupDamage[s.group] = (b.groupDamage[s.group]||0) + totalU;
    addLog(sid, "💫 發動大招【"+u.name+"】對「"+b.name+"」造成 "+totalU+" 傷害!(Boss 剩 "+b.hp+" HP)");
    toast("💫 "+s.name+" 大招【"+u.name+"】-"+totalU+"!");
    sfx("levelup");
    if(b.hp<=0){ winBoss(); return; }
    save(); render();
    return;
  }
  // ── 攻擊倍率型技能(擇一最高觸發,避免爆炸疊乘) ──
  let critMul = 1, critTag = "";
  const critTable = [
    ["execute", 2.5, "☠️斬殺", ()=> b.hp/b.maxHp <= 0.3],   // 戰士:低血斬殺
    ["bash",    1.8, "💥重擊", ()=> true],                  // 戰士
    ["blast",   2,   "💥爆裂", ()=> true],                  // 法師火
    ["lethal",  2.5, "☠️致命", ()=> true],                  // 遊俠
    ["edge",    2,   "🗡暴擊", ()=> true],                  // 遊俠
    ["judge",   2.2, "⚖️審判", ()=> true],                  // 牧師懲
    ["smite",   1.8, "🌟聖光", ()=> true],                  // 牧師懲
  ];
  let critId=null;
  for(const [id,m2,tag,cond] of critTable){
    if(skillLv(s,id) && cond() && roll(id)){ if(m2>critMul){ critMul=m2; critTag=tag; critId=id; } }
  }
  for(const id of advancedAttackIds(s.job)){
    const m2=skillVal(s,id); if(m2>critMul && roll(id)){ critMul=m2; critTag=(skillDef(s.job,id)||{}).icon+(skillDef(s.job,id)||{}).name; critId=id; }
  }
  if(critMul>1){
    dmg = Math.round(dmg*critMul); fxMsgs.push(critTag);
    if(critId){
      if(SKILL_POP[critId]) skillPop(critId, '[data-charwall="'+s.id+'"]');
      else advancedCombatFx(s,critId,'[data-charwall="'+s.id+'"]');
    }
  }
  // 🐉 四聖獸 Boss 戰技(與團體戰同構)
  if(s.petId===1 && Math.random()*100 < 12){ const ex = Math.max(1, Math.round(dmg*0.6)); dmg += ex; fxMsgs.push("🐉青龍擺尾+"+ex); }
  if(s.petId===2 && Math.random()*100 < 10){ if(!b.poison || (b.poison.dmg||0) < 5){ b.poison = { dmg:5, turns:3 }; } fxMsgs.push("🐦朱雀燎原(灼燒3回合)"); }
  if(s.petId===4 && Math.random()*100 < 12){ b.counterHalf = true; fxMsgs.push("🐢玄武堅甲(反擊減半)"); }
  // 隕石:3倍+震懾
  if(skillLv(s,"meteor") && roll("meteor")){ dmg *= 3; b.counterHalf = true; fxMsgs.push("☄️隕石"); skillPop("meteor", '[data-charwall="'+s.id+'"]'); }
  const critical=resolveCriticalHit(s,critId,dmg,{allow:!(critId&&typeof arenaSkillIsUltimate==='function'&&arenaSkillIsUltimate(s,critId))});
  dmg=critical.dmg;
  if(critical.crit && !critical.embedded) fxMsgs.push("💥爆擊×"+critical.mult.toFixed(2));
  b.hp = Math.max(0, b.hp - dmg);
  b.damage[sid] = (b.damage[sid]||0) + dmg;
  b.groupDamage[s.group] = (b.groupDamage[s.group]||0) + dmg;
  const addHit = (amt, tag)=>{ const e=Math.max(1,Math.round(amt)); b.hp=Math.max(0,b.hp-e); b.damage[sid]+=e; b.groupDamage[s.group]+=e; fxMsgs.push(tag+e); };
  triggerBossForgeWeaponSkill(s,b,dmg,fxMsgs,addHit);
  // 追打型
  if(skillLv(s,"spark")  && roll("spark")){  addHit(dmg*0.5, "⚡電擊+"); skillPop("spark", '[data-charwall="'+s.id+'"]'); }
  if(skillLv(s,"chain")  && roll("chain")){ addHit(dmg*0.5,"🌩連鎖+"); addHit(dmg*0.5,"🌩+"); skillPop("chain", '[data-charwall="'+s.id+'"]'); }
  if(skillLv(s,"shadow") && roll("shadow")){ addHit(dmg, "🌑影襲+"); skillPop("shadow", '[data-charwall="'+s.id+'"]'); }
  // 冰系控制
  if(skillLv(s,"frost")  && roll("frost")){ b.counterHalf = true; fxMsgs.push("❄️冰箭(反擊減半)"); skillPop("frost", '[data-charwall="'+s.id+'"]'); }
  if(skillLv(s,"freeze") && roll("freeze")){ b.frozen = true; fxMsgs.push("🧊凍結(免反擊)"); skillPop("freeze", '[data-charwall="'+s.id+'"]'); }
  // 破綻/風暴(標記)
  let exposed = false;
  if(skillLv(s,"expose") && roll("expose")){ b.weakness=true; b.exposeBonus=skillVal(s,"expose"); exposed=true; fxMsgs.push("🎯破綻"); skillPop("expose", '[data-charwall="'+s.id+'"]'); }
  if(skillLv(s,"storm")  && roll("storm")){ b.weakness=true; b.exposeBonus=Math.max(b.exposeBonus||0,skillVal(s,"storm")); fxMsgs.push("🌪風暴標記"); skillPop("storm", '[data-charwall="'+s.id+'"]'); }
  // 毒刃:DoT 疊層
  if(skillLv(s,"poison") && roll("poison")){ b.poison = { dmg: skillVal(s,"poison"), turns: 3 }; fxMsgs.push("🐍毒刃"); skillPop("poison", '[data-charwall="'+s.id+'"]'); }
  // 遊俠原輔助(無破綻技能時保底標記)
  if(s.job==="Rogue" && !exposed && !skillLv(s,"expose")){ b.weakness = true; note += ",標記破綻(下一擊+30%)"; }
  // 偷金:掏包技能或遊俠保底
  const stealCh = (s.job==="Rogue" ? 50 : 0);   // v124:pocket 已改為煙霧彈(團體戰),遊俠保留天生50%摸金
  if(stealCh && Math.random()*100 < stealCh){ const g=creditGold(s,10+Math.floor(Math.random()*21),"戰鬥摸金",true); if(g)fxMsgs.push("🍀金幣+"+g); if(skillLv(s,"pocket")) skillPop("pocket", '[data-charwall="'+s.id+'"]'); }
  // 貪婪:攻擊時20%偷10~20金
  // 募集:機率為隨機隊友募得一份物資(轉盤獎勵,圖紙限普通級)
  if(skillLv(s,"greed") && Math.random()*100 < skillChance(s,"greed")){
    const mates = state.students.filter(x=>x.group===s.group);
    const lucky = mates[Math.floor(Math.random()*mates.length)];
    const msg = grantMuster(lucky);
    fxMsgs.push("🎁募集→"+lucky.name);
    addLog(s.id, "🎁 募集!為 "+lucky.name+" "+msg);
    skillPop("greed", '[data-charwall="'+s.id+'"]');
  }
  // 治療:小治療/群療技能,或牧師保底
  const healRoll = skillLv(s,"heal") && roll("heal");
  const groupRoll = skillLv(s,"groupheal") && roll("groupheal");
  if(groupRoll){
    const amt = skillVal(s,"groupheal");
    skillPop("groupheal", '[data-charwall="'+s.id+'"]');   // 先跳技能名
    state.students.filter(x=>x.group===s.group && x.currentHp>0).forEach(x=>{
      const h = Math.min(amt, x.maxHp+skillMaxHpBonus(x) - x.currentHp);
      x.currentHp += h;
      if(h>0) dmgPop(h, '[data-charwall="'+x.id+'"]', "heal");   // 再各自跳回血(即時)
    });
    fxMsgs.push("🌿群療+"+amt);
  }else if(healRoll || (s.job==="Cleric" && !skillLv(s,"heal") && !skillLv(s,"groupheal"))){
    const ally = state.students.filter(x=>x.group===s.group && x.currentHp>0 && x.currentHp<x.maxHp)
      .sort((p,q)=>(p.currentHp/p.maxHp)-(q.currentHp/q.maxHp))[0];
    if(ally){
      const amt = (skillLv(s,"heal")?skillVal(s,"heal"):20);
      const h = Math.min(amt, ally.maxHp+skillMaxHpBonus(ally) - ally.currentHp);
      ally.currentHp += h;
      fxMsgs.push((skillLv(s,"heal")?"💚":"")+"治療"+ally.name+"+"+h);
      if(skillLv(s,"heal")){ skillPop("heal", '[data-charwall="'+s.id+'"]'); dmgPop(h, '[data-charwall="'+ally.id+'"]', "heal"); }
    }
  }
  // ── 裝備詞條(攻擊型)觸發 ──
  for(const afk of equippedAffixes(s)){
    const af = affixInfo(afk); if(!af || af.kind!=="atk") continue;
    if(Math.random()*100 >= af.chance) continue;
    if(af.mult){ let mult=af.mult;if(af.execute&&b.hp/Math.max(1,b.maxHp)<=af.execute)mult+=.7;const ex=Math.max(1,Math.round(dmg*(mult-1))); b.hp=Math.max(0,b.hp-ex); b.damage[sid]+=ex; b.groupDamage[s.group]+=ex; fxMsgs.push(af.icon+af.name+"+"+ex); comicPop(af.name,"boom",af.key==="celestial"?"#ffe58a":(af.key==="tempest"?"#62d9ff":"#f5731f"));if(af.expose){b.weakness=true;b.exposeBonus=Math.max(b.exposeBonus||0,af.expose);} }
    else if(af.key==="frost"){ b.counterHalf=true; fxMsgs.push("❄️寒霜"); comicPop("寒霜","spike","#7ad0e8"); }
    else if(af.key==="venom"){ b.poison={dmg:af.dot,turns:3}; fxMsgs.push("🐍劇毒"); comicPop("劇毒","cloud","#4bae4f"); }
    else if(af.heal){ const h=Math.min(af.heal, (s.maxHp+skillMaxHpBonus(s))-s.currentHp); s.currentHp+=h; fxMsgs.push(af.icon+af.name+"+"+h); comicPop(af.name,"cloud",af.key==="renewal"?"#69d48a":"#e05252"); }
    else if(af.groupHeal){let total=0;state.students.filter(x=>x.group===s.group&&x.currentHp>0).forEach(x=>{const h=Math.min(Math.max(1,Math.round((x.maxHp+skillMaxHpBonus(x))*af.groupHeal)),x.maxHp+skillMaxHpBonus(x)-x.currentHp);x.currentHp+=h;total+=h;if(h)dmgPop(h,'[data-charwall="'+x.id+'"]',"heal");});fxMsgs.push(af.icon+af.name+"+"+total);comicPop(af.name,"cloud","#ffe58a");}
    else if(af.expose){b.weakness=true;b.exposeBonus=Math.max(b.exposeBonus||0,af.expose);fxMsgs.push(af.icon+af.name+"(增傷"+Math.round(af.expose*100)+"%)");comicPop(af.name,"spike","#e9b04c");}
    else if(af.key==="fortune"){ const g=creditGold(s,af.gold,"裝備幸運詞條",true); if(g){fxMsgs.push("🍀幸運+"+g+"金");comicPop("幸運","cloud","#f5c518");} }
  }
  // ── 光暈屬性增益:攻擊時機率觸發,給自己上暫時屬性 buff ──
  for(const gfx of equippedGlows(s)){
    const G = ELEM_FX[gfx];
    if(Math.random()*100 >= G.chance) continue;
    s.glowBuff = s.glowBuff || {};
    const cur = s.glowBuff[G.stat];
    if(cur && cur.turns>0){ cur.turns = G.turns; cur.amt = Math.max(cur.amt, G.amt); }  // 刷新
    else s.glowBuff[G.stat] = { amt:G.amt, turns:G.turns };
    fxMsgs.push(G.icon+G.statName+"+"+G.amt);
    comicPop(G.statName+"+"+G.amt+"!","boom",G.core, '[data-charwall="'+s.id+'"]');
  }
  // ── 團隊光環(aura)技能:機率發動,給全組上一回合 buff ──
  const auraSkills = skillList(s.job).filter(sk=>sk.kind==="aura");
  for(const sk of auraSkills){
    if(!on || !skillLv(s, sk.id)) continue;
    if(Math.random()*100 >= skillChance(s, sk.id)) continue;
    const g = s.group;
    b.groupBuffs[g] = b.groupBuffs[g] || {};
    const buf = b.groupBuffs[g];
    if(sk.aura==="atk"){ buf.atk = Math.max(buf.atk||0, skillVal(s,sk.id)); fxMsgs.push("📣"+sk.name); comicPop(sk.name+"!","boom","#f5731f", '[data-charwall="'+s.id+'"]'); }
    else if(sk.aura==="def"){ buf.def = Math.max(buf.def||0, skillVal(s,sk.id)); fxMsgs.push("🛡"+sk.name); comicPop(sk.name+"!","spike","#4bae4f", '[data-charwall="'+s.id+'"]'); }
    else if(sk.aura==="expose"){ buf.expose = true; fxMsgs.push("🏃"+sk.name); comicPop(sk.name+"!","spike","#7ad0e8", '[data-charwall="'+s.id+'"]'); }
    else if(sk.aura==="heal"){
      const amt = skillVal(s, sk.id);
      comicPop(sk.name+"!","cloud","#4bae4f", '[data-charwall="'+s.id+'"]');   // 先技能名
      state.students.filter(x=>x.group===g && x.currentHp>0).forEach(x=>{
        const h = Math.min(amt, (x.maxHp+skillMaxHpBonus(x)) - x.currentHp);
        x.currentHp += h;
        if(h>0) dmgPop(h, '[data-charwall="'+x.id+'"]', "heal");   // 再各自回血(即時)
      });
      fxMsgs.push("🎵"+sk.name+"+"+amt);
    }
  }
  if(fxMsgs.length) note += "," + fxMsgs.join(",");
  addLog(sid, "對「"+b.name+"」造成 "+dmg+" 傷害"+note+"(Boss 剩 "+b.hp+" HP)");
  // 傷害數字對話框(排在技能名對話框之後,依序播放,錨定施法者角色頭上)
  dmgPop(dmg, '[data-charwall="'+s.id+'"]', critical.crit?"crit":"dmg", {maxHp:b.maxHp});
  sfx("award");
  if(b.hp<=0){ winBoss(); return; }
  save(); render();
}
/* Boss 一般反擊(含受擊型技能觸發) */
/* ── 小組自動輪攻 ──────────────────────────────
 * 各組按「組平均敏捷」高→低排序決定出手順序;組內按個人敏捷高→低依序攻擊。
 * 老師按一次「小組攻擊」= 一組全員打完 + 一次 Boss 反擊 = 一回合。
 * 打過的人進 standby;全部組打完自動清空 standby(新一輪)。 */
function groupAvgAgi(g){
  const ms = state.students.filter(s=>s.group===g);
  if(!ms.length) return 0;
  return ms.reduce((a,s)=>a+totalStats(s).agi, 0) / ms.length;
}
function nextAttackGroup(){
  const b = state.boss; if(!b) return null;
  if(!b.standby) b.standby = {};
  // 依組平均敏捷排序,找出「還沒全部待機」且「有存活可攻擊成員」的第一組
  const groups = [...new Set(state.students.map(s=>s.group))]
    .filter(g=> state.students.some(s=>s.group===g))
    .sort((a,c)=> groupAvgAgi(c) - groupAvgAgi(a));
  for(const g of groups){
    const canAct = state.students.filter(s=>s.group===g && s.currentHp>0 && !b.standby[s.id]);
    if(canAct.length) return g;
  }
  return null;   // 全部組都打完了
}
function groupAttackTurn(){
  const b = state.boss; if(!b) return;
  if(b.casting){ toast("Boss 正在詠唱,先按「Boss 反擊」讓隕石落下!", true); return; }
  const g = nextAttackGroup();
  if(!g){ toast("所有小組都攻擊過了,已重置為新一輪", true); b.standby = {}; render(); return; }
  // 組內按個人敏捷高→低依序攻擊
  const actors = state.students.filter(s=>s.group===g && s.currentHp>0 && !b.standby[s.id])
    .sort((a,c)=> totalStats(c).agi - totalStats(a).agi);
  b.roundActiveGroup = g;
  for(const s of actors){
    if(!state.boss) return;                 // 若中途擊殺
    attackBoss(s.id);
    b.standby[s.id] = true;
  }
  // 全組打完 → 標記此組成員待機,觸發一次反擊
  if(state.boss){
    addLog("-", "⚔️ "+g+" 組(平均敏捷 "+groupAvgAgi(g).toFixed(1)+")完成攻擊,進入待機");
    bossCounter();
    if(state.boss && state.boss.groupBuffs) delete state.boss.groupBuffs[g];   // 光環持續一回合,回合結束清除
    // 若這是最後一組,清空待機開新一輪
    if(state.boss && !nextAttackGroup()){
      state.boss.standby = {};
      addLog("-", "🔄 全部小組攻擊完畢,待機重置,開始新一輪");
      toast("🔄 新一輪!所有小組可再次攻擊");
    }
  }
  save(); render();
}
function skipGroupTurn(){
  const b = state.boss; if(!b) return;
  const g = nextAttackGroup();
  if(!g){ b.standby = {}; toast("已是最後,重置新一輪"); render(); return; }
  state.students.filter(s=>s.group===g).forEach(s=>{ b.standby[s.id] = true; });
  addLog("-", "⏭ 老師跳過 "+g+" 組的攻擊");
  toast("已跳過 "+g+" 組");
  if(!nextAttackGroup()){ b.standby = {}; addLog("-","🔄 待機重置,新一輪"); }
  save(); render();
}

/* 對單一目標施加反擊傷害(含嘲諷/庇護/格擋/聖盾/荊棘/不屈/復甦),回傳描述字串 */
function bossHitVictim(t, dmgBase){
  const b = state.boss; const on = skillsEnabled();
  let victim = t, tanked = false;
  if(t.job !== "Warrior"){
    const tank = state.students.find(x=>x.group===t.group && x.job==="Warrior" && x.currentHp>0);
    if(tank){ victim = tank; tanked = true; }
  }
  let dmg = dmgBase * defMultiplier(victim) * advancementWardMult(victim);
  if(advancementBonus(victim,'ward')>0) advancementFx(victim,'ward','[data-charwall="'+victim.id+'"]');
  if(victim.job==="Warrior") dmg *= 0.7;
  if(tanked && on) dmg *= (1 - skillPassive(victim,"taunt"));
  if(on){
    const guard = state.students.filter(x=>x.group===victim.group && x.job==="Cleric").reduce((m,x)=>Math.max(m,skillPassive(x,"aegis")),0);
    if(guard) dmg *= (1 - guard/100);
  }
  if(b.counterHalf) dmg *= 0.5;
  // 守護號令光環:全組受傷減免
  const vgb = b.groupBuffs && b.groupBuffs[victim.group];
  if(vgb && vgb.def){ dmg *= (1 - vgb.def); }
  let tag = "";
  if(victim.petId===3 && Math.random()*100 < 12){              // 🐯 白虎:完全閃避 Boss 攻擊(直接結束,不吃保底傷害)
    addLog(victim.id, "🐯 白虎疾步!"+victim.name+" 閃過了「"+b.name+"」的攻擊!");
    comicPop("🐯 白虎疾步!","cloud","#e8e8e8",'[data-charwall="'+victim.id+'"]');
    return;
  }
  if(on && victim.job==="Warrior" && skillChance(victim,"block") && Math.random()*100 < skillChance(victim,"block")){ dmg *= 0.5; tag += "🧱格擋"; skillPop("block", '[data-charwall="'+victim.id+'"]'); }
  if(on){
    const cleric = state.students.find(x=>x.group===victim.group && x.job==="Cleric" && x.currentHp>0 && skillChance(x,"shield"));
    if(cleric && Math.random()*100 < skillChance(cleric,"shield")){ dmg *= 0.7; tag += "🔰聖盾"; skillPop("shield", '[data-charwall="'+victim.id+'"]'); }
  }
  dmg = Math.max(1, Math.round(dmg));
  // 裝備守護詞條:受擊機率擋半傷
  for(const afk of equippedAffixes(victim)){
    const af = affixInfo(afk);
    if(af && af.kind==="def" && af.reduce && Math.random()*100 < af.chance){ const keep=af.reduce; dmg = Math.max(1, Math.round(dmg*keep)); tag += af.icon+af.name; comicPop(af.name,"spike",af.key==="barrier"||af.key==="aegis"?"#a980ff":"#4bc0e8",'[data-charwall="'+victim.id+'"]'); if(af.key==="aegis"){victim.frozen=0;victim.slow=0;victim.silenced=0;} break; }
    if(af && af.kind==="def" && af.reflect && Math.random()*100 < af.chance){const reflected=Math.max(1,Math.round(dmg*af.reflect));b.hp=Math.max(0,b.hp-reflected);b.damage[victim.id]=(b.damage[victim.id]||0)+reflected;b.groupDamage[victim.group]=(b.groupDamage[victim.group]||0)+reflected;tag+=af.icon+af.name+reflected;comicPop(af.name,"spike","#6bc45a",'[data-charwall="'+victim.id+'"]');}
  }
  if(on && victim.job==="Warrior" && skillChance(victim,"thorns") && Math.random()*100 < skillChance(victim,"thorns")){
    const reflect = Math.max(1, Math.round(dmg*0.5));
    b.hp = Math.max(0, b.hp - reflect);
    b.damage[victim.id] = (b.damage[victim.id]||0) + reflect;
    b.groupDamage[victim.group] = (b.groupDamage[victim.group]||0) + reflect;
    tag += "🌵荊棘反彈"+reflect; skillPop("thorns", '[data-charwall="'+victim.id+'"]');
  }
  for(const id of ['counter_stance','sacred_counter']){
    if(on && skillChance(victim,id) && Math.random()*100 < skillChance(victim,id)){
      const reflect=Math.max(1,Math.round(dmg*skillVal(victim,id)));
      b.hp=Math.max(0,b.hp-reflect); b.damage[victim.id]=(b.damage[victim.id]||0)+reflect; b.groupDamage[victim.group]=(b.groupDamage[victim.group]||0)+reflect;
      tag+=(id==='sacred_counter'?'⚡神聖反擊':'⚔️反擊姿態')+reflect; skillPop(id,'[data-charwall="'+victim.id+'"]');
    }
  }
  const phoenix=equippedAffixes(victim).map(affixInfo).find(a=>a&&a.revive);
  if(victim.currentHp-dmg<=0&&phoenix&&Math.random()*100<phoenix.chance){victim.currentHp=Math.max(1,Math.round((victim.maxHp+skillMaxHpBonus(victim))*phoenix.revive));tag+=" "+phoenix.icon+phoenix.name+"涅槃";comicPop("鳳凰涅槃!","boom","#ff9b42",'[data-charwall="'+victim.id+'"]');}
  else if(victim.currentHp - dmg <= 0 && on && victim.job==="Warrior" && !b.usedEndure && skillChance(victim,"endure") && Math.random()*100 < skillChance(victim,"endure")){
    victim.currentHp = 1; b.usedEndure = true; tag += "💪不屈保命"; skillPop("endure", '[data-charwall="'+victim.id+'"]');
  }else{
    victim.currentHp = Math.max(0, victim.currentHp - dmg);
  }
  if(victim.currentHp<=0){ addLog(victim.id, "被「"+b.name+"」擊倒!"); tryRevive(victim); }
  // 在被擊角色頭上跳扣血對話框
  dmgPop(dmg, '[data-charwall="'+victim.id+'"]', "dmg");
  return (tanked ? victim.name+" 替 "+t.name+" 承受" : victim.name)+"(-"+dmg+(tag?" "+tag:"")+")";
}
/* Boss 反擊:一次只發一招(機率池)。烈焰隕石保留「詠唱一回合」機制。 */
function bossCounter(){
  const b = state.boss; if(!b) return;
  // 光暈屬性增益:每回合遞減(所有有 buff 的學生)
  state.students.forEach(st=>{
    if(!st.glowBuff) return;
    let any = false;
    for(const stat in st.glowBuff){
      if(st.glowBuff[stat] && st.glowBuff[stat].turns>0){ st.glowBuff[stat].turns--; if(st.glowBuff[stat].turns>0) any=true; else delete st.glowBuff[stat]; }
    }
    if(!any && !Object.keys(st.glowBuff).length) st.glowBuff = null;
  });
  if(b.casting){ castMeteor(); return; }              // 詠唱中→本回合落下隕石
  // 毒刃 DoT 結算
  if(b.poison && b.poison.turns>0){
    const pd = b.poison.dmg;
    b.hp = Math.max(0, b.hp - pd); b.poison.turns--;
    addLog("-", "🐍 中毒發作,Boss -"+pd+"("+b.poison.turns+" 回合)");
    if(b.poison.turns<=0) b.poison = null;
    if(b.hp<=0){ winBoss(); return; }
  }
  if(b.frozen){
    b.frozen = false;
    addLog("-", "🧊 Boss 被凍結,本回合無法反擊!");
    toast("🧊 Boss 被凍結,免除一次反擊!");
    save(); render(); return;
  }
  const alive = state.students.filter(s=>s.currentHp>0);
  if(!alive.length){ toast("全班都倒下了…用藥水或「全員休息」恢復", true); return; }

  // ── 機率池:擲一次,只發一招 ──
  const baseDmg = ()=> 12 + Math.floor(Math.random()*9) + (b.atkBonus||0);
  // 目標組:優先「剛攻擊的那組」,否則隨機一組(單獨按反擊時)
  const allGroups = [...new Set(alive.map(s=>s.group))];
  const focusGroup = (b.roundActiveGroup && alive.some(s=>s.group===b.roundActiveGroup))
    ? b.roundActiveGroup : allGroups[Math.floor(Math.random()*allGroups.length)];
  const BOSS_ANCHOR = '[data-bossanchor]';
  const r = Math.random()*100;
  let names = [], skill = "";
  if(r < 30){                                          // 重擊 30%:針對攻擊組單人 1.1 倍
    skill = "💢 重擊";
    comicPop("重擊!", "spike", "#e23b3b", BOSS_ANCHOR);          // 先跳招式名
    const pool = alive.filter(s=>s.group===focusGroup);
    const t = (pool.length?pool:alive)[Math.floor(Math.random()*(pool.length?pool.length:alive.length))];
    names.push(bossHitVictim(t, Math.round(baseDmg()*1.1)));      // 再打(扣血對話框排後面)
  }else if(r < 50){                                    // 突襲 20%:隨機 3 人(跨組)
    skill = "🌀 突襲";
    comicPop("突襲!", "spike", "#e23b3b", BOSS_ANCHOR);
    const picks = [...alive].sort(()=>Math.random()-.5).slice(0, Math.min(3, alive.length));
    picks.forEach(t=> names.push(bossHitVictim(t, baseDmg())));
  }else if(r < 70){                                    // 吐息 20%:針對攻擊組全員
    const g = alive.some(s=>s.group===focusGroup) ? focusGroup : allGroups[Math.floor(Math.random()*allGroups.length)];
    skill = "🔥 吐息("+g+"組)";
    comicPop("吐息!", "boom", "#f5731f", BOSS_ANCHOR);
    alive.filter(s=>s.group===g).forEach(t=> names.push(bossHitVictim(t, baseDmg())));
  }else if(r < 85){                                    // 烈焰隕石 15%:詠唱(或落下)
    if(!b.casting && (b.meteorCast||0) < 3){
      b.casting = true;
      addLog("-", "⚠️ 「"+b.name+"」開始詠唱【烈焰隕石】!下一次反擊將對全體造成無視防禦傷害!");
      toast("⚠️ Boss 詠唱烈焰隕石!快治療、補血或搶攻!", true);
      comicPop("詠唱中…","boom","#e23b3b", BOSS_ANCHOR); sfx("chest");
      b.counterHalf = false; save(); render(); return;
    }else{                                             // 已在詠唱或次數用盡→改重擊(針對攻擊組)
      skill = "💢 重擊";
      comicPop("重擊!", "spike", "#e23b3b", BOSS_ANCHOR);
      const pool = alive.filter(s=>s.group===focusGroup);
      const t = (pool.length?pool:alive)[Math.floor(Math.random()*(pool.length?pool.length:alive.length))];
      names.push(bossHitVictim(t, Math.round(baseDmg()*1.1)));
    }
  }else{                                               // 自癒 15%:恢復 20% 血
    const heal = Math.round(b.maxHp*0.2);
    b.hp = Math.min(b.maxHp, b.hp + heal);
    b.counterHalf = false;
    addLog("-", "💚 「"+b.name+"」使用【自癒】,恢復 "+heal+" HP(剩 "+b.hp+")");
    toast("💚 Boss 自癒,恢復 "+heal+" HP!", true);
    comicPop("自癒","cloud","#4bae4f", BOSS_ANCHOR); sfx("chest");
    save(); render(); return;
  }
  b.counterHalf = false;
  addLog("-", "🐉 「"+b.name+"」"+skill+":"+names.join("、"));
  toast(skill+"!"+names.join("、"), true); sfx("chest");
  save(); render();
}
/* 牧師復甦:同組有人倒下時機率復活 */
function tryRevive(victim){
  const b = state.boss; if(!b || !skillsEnabled()) return;
  const cleric = state.students.find(x=>x.group===victim.group && x.job==="Cleric" && x.currentHp>0 && skillChance(x,"revive"));
  if(cleric && !b.revivedThisFight[victim.id] && Math.random()*100 < skillChance(cleric,"revive")){
    victim.currentHp = skillVal(cleric,"revive") || 20;
    b.revivedThisFight[victim.id] = true;
    addLog(cleric.id, "💗 復甦!"+cleric.name+" 復活了 "+victim.name+"("+victim.currentHp+" HP)");
    toast("💗 "+cleric.name+" 復活了 "+victim.name+"!"); skillPop("revive", '[data-charwall="'+victim.id+'"]');
  }
}
/* 釋放烈焰隕石:全體無視防禦傷害 */
function castMeteor(){
  const b = state.boss; if(!b) return;
  b.casting = false; b.meteorCast = (b.meteorCast||0) + 1;
  const dmg = 30 + (b.atkBonus||0);                   // 無視防禦固定值
  comicPop("烈焰隕石!", "boom", "#e23b3b", '[data-bossanchor]');   // 先跳招式名
  const hit = [];
  for(const s of state.students.filter(x=>x.currentHp>0)){
    let d = dmg, tag = "";
    // 聖盾仍可吸收一部分(絕招無視防禦,但技能護盾例外,給牧師價值)
    if(skillsEnabled()){
      const cleric = state.students.find(x=>x.group===s.group && x.job==="Cleric" && x.currentHp>0 && skillChance(x,"shield"));
      if(cleric && Math.random()*100 < skillChance(cleric,"shield")){ d = Math.round(d*0.7); tag=" 🔰聖盾"; skillPop("shield", '[data-charwall="'+s.id+'"]'); }
    }
    s.currentHp = Math.max(0, s.currentHp - d);
    hit.push(s.name+"(-"+d+tag+")");
    dmgPop(d, '[data-charwall="'+s.id+'"]', "dmg");   // 每人頭上即時扣血
    if(s.currentHp<=0){ addLog(s.id, "被烈焰隕石擊倒!"); tryRevive(s); }
  }
  addLog("-", "☄️🔥 【烈焰隕石】落下!全體受到 "+dmg+" 點無視防禦傷害:"+hit.join("、"));
  toast("☄️🔥 烈焰隕石!全體 -"+dmg+"(無視防禦)", true);
  sfx("chest");
  save(); render();
}
/* 依傷害貢獻度加權擲骰選出得主 */
function rollByContribution(damageMap){
  const entries = Object.entries(damageMap).filter(([sid,d])=> d>0 && stu(sid));
  const total = entries.reduce((a,e)=>a+e[1], 0);
  if(!total) return null;
  let r = Math.random() * total;
  for(const [sid,d] of entries){ r -= d; if(r<=0) return sid; }
  return entries[entries.length-1][0];
}
function winBoss(){
  state.bossKills = (state.bossKills||0) + 1;
  const b = state.boss; if(!b) return;
  state.students.forEach(st=>{ st.glowBuff = null; });   // 戰鬥結束清光暈增益
  const parts = Object.keys(b.damage).filter(sid=>stu(sid));
  const totalDmg = parts.reduce((a,sid)=>a+b.damage[sid], 0) || 1;
  let mvp = null, mvpDmg = -1;
  for(const sid of parts){ if(b.damage[sid]>mvpDmg){ mvp=sid; mvpDmg=b.damage[sid]; } }
  addLog("-", "🎉 Boss「"+b.name+"」被擊敗!參戰 "+parts.length+" 人");
  progBossDown();                                            // 閘門:解鎖競技場

  /* ── 資源(XP/金幣)依小組貢獻度分配,組內平分 ── */
  const groupTotal = totalDmg;
  const groupShares = [];   // 結算顯示用
  const poolXp = b.rewardXp, poolGold = b.rewardGold;
  const activeGroups = Object.keys(b.groupDamage).filter(g=>b.groupDamage[g]>0);
  for(const g of activeGroups){
    const share = b.groupDamage[g] / groupTotal;                       // 該組佔全體傷害比例
    const gXpPool = Math.round(poolXp * share * parts.length);         // 池子×比例(乘參戰人數維持總量感)
    const gGoldPool = Math.round(poolGold * share * parts.length);
    const members = state.students.filter(s=>s.group===g && b.damage[s.id]>0);
    if(!members.length) continue;
    const perXp = Math.round(gXpPool / members.length);                // 組內平分
    const perGold = Math.round(gGoldPool / members.length);
    members.forEach(s=> reward(s.id, perXp, perGold, "擊敗 Boss「"+b.name+"」(小組平分)", null, true));
    groupShares.push({ group:g, pct:Math.round(share*100), perXp, perGold, n:members.length });
  }

  /* ── 裝備/圖紙/道具:依個人佔全體貢獻度比例擲骰(機率獲得)── */
  const drops = [];
  let bpRate = 0.05;
  if(skillsEnabled()){
    const scouts = parts.map(id=>stu(id)).filter(x=>x && x.job==="Rogue");
    const best = scouts.reduce((m,x)=>Math.max(m, skillPassive(x,"treasure")), 0);
    bpRate += best/100;
  }
  /* 稀有／傳說詞條與鍛造武技只在掉落當下決定；傳說武器圖紙另有 30% 機率鎖定一項固定 8% 武技。 */
  for(const bt of BP_TYPES){
    if(Math.random() < bpRate){
      const tier=rollTier(),weaponSkill=tier==="legend"&&bt==="weapon"&&Math.random()<.30?rollForgeWeaponSkill():null,statCode=encodeBlueprintStats(rollBlueprintStatRange(bt,tier));
      drops.push({kind:"bp",type:bt,tier,affix:(tier==="rare"||tier==="legend")?rollAffix(tier):null,weaponSkill,statCode});
    }
  }
  if(Math.random() < 0.05) drops.push({kind:"legend"});

  const dropResults = [];   // 結算對話框用
  for(const d of drops){
    const sid = rollByContribution(b.damage); if(!sid) continue;
    const s = stu(sid); if(!s) continue;
    const winPct = Math.round(b.damage[sid]/totalDmg*100);
    if(d.kind==="bp"){
      const ti=tierInfo(d.tier),k=bpKey(d.type,d.tier,d.affix,d.weaponSkill,d.statCode);
      s.blueprints[k] = (s.blueprints[k]||0) + 1;
      const af = d.affix ? affixInfo(d.affix) : null;
      const ws=d.weaponSkill?forgeWeaponSkillInfo(d.weaponSkill):null;
      const afTxt = af ? "["+af.icon+af.name+"]" : "";
      const wsTxt=ws?"["+ws.icon+ws.name+"・8%]":"",rangeTxt=d.statCode?"["+blueprintStatText(d.statCode)+"]":"";
      addLog(sid,"貢獻度擲骰勝出!獲得【"+ti.icon+ti.name+"・"+TYPE_NAME[d.type]+"設計圖紙"+afTxt+wsTxt+rangeTxt+"】");
      dropResults.push({name:s.name,icon:ti.icon,item:ti.name+TYPE_NAME[d.type]+"圖紙"+afTxt+wsTxt+rangeTxt,pct:winPct});
    }else{
      const legends = SHOP_ITEMS.filter(i=>i.rarity==="Legendary"&&(!i.jobs||i.jobs.includes(s.job)));
      const cands = legends.filter(i=> s[i.type+"Id"]!==i.id);
      if(cands.length){
        const it = cands[Math.floor(Math.random()*cands.length)];
        s[it.type+"Id"] = it.id;
        addLog(sid, "貢獻度擲骰勝出!掉落傳說裝備「"+it.name+"」");
        dropResults.push({ name:s.name, icon:"🏆", item:"傳說裝備・"+it.name, pct:winPct });
      }else{
        creditGold(s,100,"傳說重複補償",true);
        addLog(sid, "傳說擲骰勝出,但已有全部傳說裝備,改領 100 金幣");
        dropResults.push({ name:s.name, icon:"💰", item:"100 金幣(已有全套傳說)", pct:winPct });
      }
    }
    sfx("chest");
  }
  if(!drops.length) addLog("-", "本次結算沒有掉落(每種圖紙與傳說裝備各 5% 機率)");

  const mv = stu(mvp);
  for(const sid of parts){ const s = stu(sid); if(s){unlock(s,"boss_win");unlock(s,"boss_mvp");} }

  // 結算資料存起來給對話框
  state.lastBossResult = {
    name: b.name, parts: parts.length,
    mvp: mv ? mv.name : "-", mvpPct: Math.round(mvpDmg/totalDmg*100),
    groupShares, dropResults,
    contrib: parts.map(sid=>({ name:stu(sid).name, pct:Math.round(b.damage[sid]/totalDmg*100) })).sort((a,b)=>b.pct-a.pct),
  };
  // 🗺 擊敗屬性魔王 → 解鎖對應戰場
  if(b.elem && ELEM_BOSSES[b.elem]){
    const eb = ELEM_BOSSES[b.elem];
    if(!Array.isArray(state.unlockedMaps)) state.unlockedMaps = [];
    if(!state.unlockedMaps.includes(eb.map)){
      state.unlockedMaps.push(eb.map);
      state.lastBossResult.unlockedMap = {icon:eb.icon, name:eb.mapName};
      addLog("-", "🗺 擊敗「"+eb.name+"」!團體戰新戰場【"+eb.icon+" "+eb.mapName+"】已解鎖!");
    }
  }
  state.boss = null;
  levelUpFx("🎉 Boss 被擊敗!"); sfx("goal");
  save(); render();
  showBossResult();
}
/* 打倒魔王結算對話框 */
function showBossResult(){
  const r = state.lastBossResult; if(!r) return;
  const host = document.getElementById("modalHost"); if(!host) return;
  const grpRows = r.groupShares.map(g=>
    '<tr><td>'+esc(g.group)+' 組</td><td class="num">'+g.pct+'%</td><td class="num">'+g.n+' 人平分</td><td class="num">+'+g.perXp+' XP<br>+'+g.perGold+' 金</td></tr>'
  ).join("") || '<tr><td colspan="4" class="mini">無資源分配</td></tr>';
  const dropRows = r.dropResults.length
    ? r.dropResults.map(d=>'<div class="stat-chip">'+d.icon+' <b>'+esc(d.name)+'</b> 抽中 '+esc(d.item)+'<span class="mini">(貢獻 '+d.pct+'%)</span></div>').join("")
    : '<div class="mini">這次沒有掉落物品(圖紙/傳說裝備各 5% 機率,運氣問題,再接再厲!)</div>';
  host.innerHTML = '<div class="overlay" id="ovl"><div class="modal" style="max-width:540px;text-align:left">'
    + '<h3 style="text-align:center">🎉 擊敗「'+esc(r.name)+'」!結算</h3>'
    + '<div class="mini" style="text-align:center;margin-bottom:8px">參戰 '+r.parts+' 人共同完成目標；不公布個人高低排名。</div>'
    + (r.unlockedMap ? '<div style="text-align:center;margin:10px 0;padding:12px;background:linear-gradient(135deg,#fff6d8,#ffd966);'
        + 'border:3px solid #141414;border-radius:10px;box-shadow:3px 3px 0 rgba(0,0,0,.4)">'
        + '<div style="font-size:30px">'+r.unlockedMap.icon+'</div>'
        + '<b style="font-size:15px">🗺 新戰場解鎖!</b>'
        + '<div class="mini" style="margin-top:2px">團體戰現在可以選擇 <b>'+esc(r.unlockedMap.name)+'</b> 了!</div></div>' : "")
    + '<h4 style="margin:8px 0 4px">💰 資源分配(依小組貢獻度,組內平分)</h4>'
    + '<table><thead><tr><th>小組</th><th>貢獻</th><th>分法</th><th>每人所得</th></tr></thead><tbody>'+grpRows+'</tbody></table>'
    + '<h4 style="margin:12px 0 4px">🎁 物品掉落(依個人貢獻度比例機率獲得)</h4>'
    + '<div class="inline-form" style="flex-wrap:wrap">'+dropRows+'</div>'
    + '<div style="text-align:center;margin-top:14px"><button class="btn gold" id="brClose">太棒了!</button></div>'
    + '</div></div>';
  document.getElementById("ovl").onclick = (e)=>{ if(e.target.id==="ovl") host.innerHTML=""; };
  document.getElementById("brClose").onclick = ()=>{ host.innerHTML=""; };
}
function endBoss(){
  if(!state.boss) return;
  addLog("-", "Boss「"+state.boss.name+"」戰鬥中止");
  state.students.forEach(st=>{ st.glowBuff = null; });   // 戰鬥結束清光暈增益
  state.boss = null; save(); render();
}
function restAll(){
  state.students.forEach(s=>{ s.currentHp = s.maxHp + skillMaxHpBonus(s); });
  addLog("-", "全員休息,HP 全部回滿");
  save(); toast("全員 HP 已回滿"); render();
}

/* ── 學生創作工坊 ─────────────────────────────────── */
function pendingDesigns(){ return state.customItems.filter(c=>c.status==="pending"); }
function blueprintVariantKeys(s,type,tier){
  return Object.keys((s&&s.blueprints)||{}).filter(k=>{
    const q=k.split(":"); return q[0]===type&&q[1]===tier&&(s.blueprints[k]||0)>0;
  }).sort((a,b)=>{
    const qa=a.split(":"),qb=b.split(":"),aa=(qa[2]?1:0)+(qa[3]?2:0),bb=(qb[2]?1:0)+(qb[3]?2:0); return aa-bb||a.localeCompare(b);
  });
}
function blueprintCount(s,type,tier){
  return blueprintVariantKeys(s,type,tier).reduce((n,k)=>n+(s.blueprints[k]||0),0);
}
function blueprintAffixKey(key){ return (String(key||"").split(":")[2]||null); }
function blueprintWeaponSkillKey(key){return (String(key||"").split(":")[3]||null);}
function blueprintStatCode(key){return (String(key||"").split(":")[4]||"");}
function editorBlueprintKey(s,ed){
  const keys=blueprintVariantKeys(s,ed.type,ed.bpTier),want=bpKey(ed.type,ed.bpTier,ed.affix||null,ed.weaponSkill||null,ed.statCode||"");
  const chosen=keys.includes(want)?want:(keys[0]||null);
  ed.affix=blueprintAffixKey(chosen);ed.weaponSkill=blueprintWeaponSkillKey(chosen);ed.statCode=blueprintStatCode(chosen);return chosen;
}
async function submitDesign(sid,name,type,tier,price,pixels,fx,smooth,img,imgT,affix,weaponSkill,imgBox,itemLevel,stats,statCode){
  const s = stu(sid); if(!s) return null;
  const ti = tierInfo(tier);
  /* 精確消耗該張圖紙：無詞條圖紙不能替代詞條圖紙，其他詞條也不能互換。 */
  weaponSkill=(type==="weapon"&&ti.key==="legend"&&forgeWeaponSkillInfo(weaponSkill))?weaponSkill:null;
  const k=bpKey(type,ti.key,affix||null,weaponSkill,statCode||"");
  if(!k){
    toast("缺少【"+ti.icon+ti.name+"・"+TYPE_NAME[type]+"設計圖紙】", true);
    return null;
  }
  if(!(s.blueprints[k]>0)){
    const af=affixInfo(affix),ws=forgeWeaponSkillInfo(weaponSkill),afTxt=af?"["+af.icon+af.name+"]":"（無詞條）",wsTxt=ws?"["+ws.icon+ws.name+" 8%]":"";
    toast("缺少【"+ti.icon+ti.name+"・"+TYPE_NAME[type]+"設計圖紙"+afTxt+wsTxt+"】", true);
    return null;
  }
  if((s.diamonds||0) < SUBMIT_FEE){                          // 💎 送審費:不足則擋下
    toast("送審需要 "+SUBMIT_FEE+" 顆鑽石(目前 "+(s.diamonds||0)+" 顆)；鑽石可由教師獎勵、學習連續或受監督互評取得", true);
    return null;
  }
  if(!ti.fx.includes(fx)) fx = "none";                       /* 品級不允許的特效降為無 */
  const rg=ITEM_LEVEL_RANGE[ti.key]||[1,90];
  itemLevel=Math.max(rg[0],Math.min(rg[1],Math.round(Number(itemLevel)||ITEM_LEVEL_BY_TIER[ti.key]||rg[0])));
  const cloudStudent=CLOUD.on()&&CLOUD.role==="student";
  const rolled=cloudStudent?null:forgeStatsFromBounds(statCode),raw=rolled||stats||{};
  const st4={atk:Math.max(0,Math.round(Number(raw.atk)||0)),def:Math.max(0,Math.round(Number(raw.def)||0)),agi:Math.max(0,Math.round(Number(raw.agi)||0)),int:Math.max(0,Math.round(Number(raw.int)||0))};
  if(!EQUIP_SLOTS.includes(type)) st4.atk=st4.def=st4.agi=st4.int=0;
  const used=st4.atk+st4.def+st4.agi+st4.int;
  if(rolled)itemLevel=rg[1];
  const budget=rolled?ti.statMax:levelStatBudget(ti.key,itemLevel,type);
  if(used>budget){ toast("物品 Lv."+itemLevel+" 可分配 "+budget+" 點能力，目前填了 "+used+" 點",true); return null; }
  const draftValue = {type, tier:ti.key, itemLevel, atk:st4.atk, def:st4.def, agi:st4.agi, int:st4.int, fx:fx||"none", affix:affix||null,weaponSkill};
  price = Math.max(Number(price)||0, ALL_SLOTS.includes(type)?equipmentPriceFloor(draftValue):ti.minPrice); /* 裝備依公式，其他作品保留品級底價 */
  const newId=cloudStudent?(Date.now()*1000+Math.floor(Math.random()*1000)):state.nextItemId++;
  const c = { id: newId, name, type, price, itemLevel,
    atk:st4.atk, agi:st4.agi, int:st4.int, def:st4.def, rarity:"Custom",
    creatorId: sid, status:"pending", pixels, gw: gridW(type), gh: gridH(type), tier: ti.key, fx: fx||"none", smooth: !!smooth, img: img||null, imgT: img ? clampImgT(imgT||{}) : null, imgBox: img ? (imgBox||null) : null,
    affix:affix||null,weaponSkill,statRange:statCode||null,
    t: new Date().toLocaleString("zh-TW",{hour12:false}) };
  if(cloudStudent){
    const result=await CLOUD.submitDesign(c);if(!result||!result.student||!result.item)throw new Error("送審結果不完整");
    const si=state.students.findIndex(x=>String(x.id)===String(sid));if(si>=0)state.students[si]=result.student;
    CLOUD._lastSnap["stu:"+sid]=JSON.stringify(result.student);state.customItems.push(result.item);return result.item;
  }
  s.blueprints[k]--;
  s.diamonds = (s.diamonds||0) - SUBMIT_FEE;                 // 💎 本機教師測試模式才在前端扣除
  state.customItems.push(c);
  const afTxt=affix?"("+affixInfo(affix).icon+affixInfo(affix).name+"詞條)":"（無詞條）",ws=forgeWeaponSkillInfo(weaponSkill),wsTxt=ws?"("+ws.icon+ws.name+"・固定8%)":"",rangeTxt=statCode?"("+blueprintStatText(statCode)+"→"+BP_STAT_KEYS.map(k=>k.toUpperCase()+"+"+st4[k]).join(" ")+")":"";
  addLog(sid,"消耗一張"+ti.icon+ti.name+TYPE_NAME[type]+"圖紙"+afTxt+wsTxt+rangeTxt+" + "+SUBMIT_FEE+"💎,把設計作品「"+name+"」送交老師審核");
  save(); return c;
}
function approveDesign(id, price, st4){
  const c = state.customItems.find(x=>x.id==id); if(!c) return false;   // 🔧 用寬鬆比較,容錯字串/數字 id
  const ti = tierInfo(c.tier||"common");
  const lvRange = ITEM_LEVEL_RANGE[ti.key]||[1,90];
  const locked=!!c.statRange;
  c.itemLevel=locked?itemLevelOf(c):Math.max(lvRange[0],Math.min(lvRange[1],Math.round(Number(st4.itemLevel)||itemLevelOf(c))));
  const selected=locked?{atk:c.atk||0,def:c.def||0,agi:c.agi||0,int:c.int||0}:st4;
  const sum=(selected.atk||0)+(selected.def||0)+(selected.agi||0)+(selected.int||0);
  const budget=levelStatBudget(ti.key,c.itemLevel,c.type);
  if(sum > budget){
    toast(ti.icon+ti.name+"・物品 Lv."+c.itemLevel+" 的能力值總和上限是 "+budget+"(目前 "+sum+")", true);
    return false;
  }
  c.atk=selected.atk;c.def=selected.def;c.agi=selected.agi;c.int=selected.int;
  c.price = Math.max(Number(price)||0, equipmentPriceFloor(c));
  c.status = "approved";
  if(c.type==="base" && c.img){                              // 🧍 素體通過審核:套用成創作者的角色外型
    const cr0 = stu(c.creatorId);
    if(cr0){ if(!cr0.art) cr0.art = {}; cr0.art["base:custom:"+(c.baseGender||cr0.gender||"male")] = c.img; cr0.customBase = c.baseGender||cr0.gender||"male"; }
  }
  addLog(c.creatorId, "作品「"+c.name+"」通過審核,正式上架!");
  const cr = stu(c.creatorId);
  if(cr){ reward(c.creatorId, 30, 0, "設計作品「"+c.name+"」上架", null, true); unlock(cr, "designer"); }
  save();
  return true;
}
function rejectDesign(id){
  const c = state.customItems.find(x=>x.id==id); if(!c) return;   // 🔧 用寬鬆比較,容錯字串/數字 id
  c.status = "rejected";
  const cr = stu(c.creatorId);
  if(cr){
    const k=bpKey(c.type,c.tier||"common",c.affix||null,c.weaponSkill||null,c.statRange||"");
    cr.blueprints[k] = (cr.blueprints[k]||0) + 1;             // 退還圖紙
    cr.diamonds = (cr.diamonds||0) + SUBMIT_FEE;              // 💎 退還送審費
  }
  addLog(c.creatorId, "作品「"+c.name+"」被退回,圖紙與 "+SUBMIT_FEE+"💎 送審費已退還,可重新設計再送審");
  save();
}

/* ── 回收確認(防誤觸)────────────────────────────── */
/* ── 世界排行榜:人均/本週/屠龍三榜 ── */
async function showLeaderboard(){
  if(!classFeatureUnlocked("world")){toast("🔒 "+classFeatureLockText("world"),true);return;}
  const host = document.getElementById("modalHost");
  host.innerHTML = '<div class="modal-bg"><div class="modal"><h4>🌍 世界排行榜</h4><div class="msub">載入中…</div></div></div>';
  let rows = [];
  try{ rows = await CLOUD.fetchLeaderboard(); }
  catch(e){ host.querySelector(".msub").textContent = "讀取失敗:"+e.message; return; }
  const wk = lbWeekKey();
  const mk = (list, valFn, unit)=> list.slice(0,10).map((r,i)=>{
    const me = r.name===(state.lbName||"") ? ' style="background:#fff3c9;font-weight:900"' : "";
    const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1);
    return '<tr'+me+'><td style="width:36px;text-align:center">'+medal+'</td><td>'+esc(r.name)+'</td><td class="num" style="text-align:right">'+valFn(r)+unit+'</td></tr>';
  }).join("") || '<tr><td colspan="3" class="mini">還沒有班級上榜,當第一名吧!</td></tr>';
  const byAvg  = [...rows].sort((a,b)=>b.avgXp-a.avgXp);
  const wAvg = r=> (r.weekAvg!==undefined) ? r.weekAvg : Math.round((r.weekXp||0)/Math.max(1,r.students||1));
  const byWeek = rows.filter(r=>r.weekKey===wk).sort((a,b)=>wAvg(b)-wAvg(a));
  const byBoss = [...rows].sort((a,b)=>(b.bossKills||0)-(a.bossKills||0));
  host.innerHTML = '<div class="modal-bg"><div class="modal" style="max-width:520px;max-height:82vh;overflow:auto">'
    + '<h4>🌍 世界排行榜</h4>'
    + '<div class="msub">參加班級:'+rows.length+' 班。只顯示班級暱稱,不含任何個人資料。</div>'
    + '<h4 style="margin-top:10px">🏆 人均 XP 榜</h4><table><tbody>'+mk(byAvg, r=>r.avgXp, " XP")+'</tbody></table>'
    + '<h4 style="margin-top:10px">📅 本週衝刺榜(人均)</h4><table><tbody>'+mk(byWeek, wAvg, " XP/人")+'</tbody></table>'
    + '<h4 style="margin-top:10px">🐉 團隊試煉榜</h4><table><tbody>'+mk(byBoss, r=>(r.bossKills||0), " 次")+'</tbody></table>'
    + '<div style="margin-top:12px"><button class="big-btn" id="lbClose">關閉</button></div>'
    + '</div></div>';
  document.getElementById("lbClose").onclick = ()=> host.innerHTML="";
}
function openRecycleModal(sid, slot){
  const s = stu(sid); if(!s) return;
  const it = itemById(s[slot+"Id"]);
  if(!it){ toast("這個欄位沒有裝備", true); return; }
  const refund = Math.floor(it.price * 0.2);
  modalHost.innerHTML = '<div class="overlay" id="ovl"><div class="modal">'
    + '<h4>回收確認</h4>'
    + '<div class="msub">要回收「'+esc(it.name)+'」嗎?<br>裝備會消失,取回 <b class="num" style="color:var(--gold)">'+refund+'</b> 金幣(售價 20%)。<br>這個動作無法復原。</div>'
    + '<div class="big-grid">'
    + '<button class="big-btn" id="rcNo">先不要</button>'
    + '<button class="big-btn" id="rcYes" style="border-color:var(--hp)">確認回收</button>'
    + '</div></div></div>';
  const close = ()=>{ modalHost.innerHTML=""; };
  document.getElementById("ovl").onclick = (e)=>{ if(e.target.id==="ovl") close(); };
  document.getElementById("rcNo").onclick = close;
  document.getElementById("rcYes").onclick = ()=>{ close(); recycleSlot(sid, slot); };
}

/* ── 公告欄與命運卡包 ─────────────────────────────── */
function todayStr(){ return new Date().toLocaleDateString("sv"); }   // YYYY-MM-DD(本地時區)

function annDateKey(d){ return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"); }
function annTimeParts(v){ const m=String(v||"07:00").match(/^(\d{1,2}):(\d{2})/); return m?[Math.min(23,+m[1]),Math.min(59,+m[2])]:[7,0]; }
function annSetTime(d,v){ const p=annTimeParts(v),x=new Date(d);x.setHours(p[0],p[1],0,0);return x; }
function annLocalDateTimeValue(d){ const z=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate())+"T"+z(d.getHours())+":"+z(d.getMinutes()); }
function weeklyAnnouncementTiming(sc,now){
  const ev=annSetTime(now,sc.eventTime||"07:30"),target=Math.max(0,Math.min(6,+sc.eventWeekday||0));
  let delta=(target-ev.getDay()+7)%7;ev.setDate(ev.getDate()+delta);
  if(ev<=now)ev.setDate(ev.getDate()+7);
  const due=new Date(ev);due.setDate(due.getDate()-Math.max(0,Math.min(6,+sc.leadDays||0)));
  const dueAt=annSetTime(due,sc.remindTime||"07:00");
  return {event:ev,due:dueAt,cycle:annDateKey(ev)};
}
function announcementScheduleTiming(sc,now){
  if(sc.mode==="once"){
    const due=new Date(sc.publishAt||0);return isNaN(due.getTime())?null:{event:due,due,cycle:"once:"+String(sc.id)};
  }
  if(sc.mode==="weekly")return weeklyAnnouncementTiming(sc,now);
  return null;
}
function announcementScheduleNextText(sc){
  if(!sc.enabled)return "已停用";
  let tm=announcementScheduleTiming(sc,new Date());if(!tm)return "時間未設定";
  if(sc.mode==="weekly"&&sc.lastCycle===tm.cycle)tm=weeklyAnnouncementTiming(sc,new Date(tm.event.getTime()+60000));
  if(sc.mode==="once")return "預計 "+tm.due.toLocaleString("zh-TW",{hour12:false})+" 發布";
  return "下次提醒 "+tm.due.toLocaleString("zh-TW",{hour12:false})+"・活動 "+tm.event.toLocaleString("zh-TW",{hour12:false});
}
function addAnnouncement(title, content, meta){
  const a={ id: state.nextAnnId++, title, content,t:new Date().toLocaleString("zh-TW",{hour12:false}) };
  if(meta)Object.assign(a,meta);
  state.announcements.unshift(a);
  addLog("-", "📣 老師發布公告「"+title+"」");
  save();
  return a;
}
function deleteAnnouncement(id){
  state.announcements = state.announcements.filter(a=>a.id!==id);
  save();
}
/* 單檔版排程器：教師頁開啟時與每分鐘檢查；週期公告只在活動開始前補發，並以活動日期防止重複。 */
function runAnnouncementSchedules(){
  if(!state||!Array.isArray(state.announcementSchedules))return 0;
  const now=new Date();let fired=0;
  state.announcementSchedules.forEach(sc=>{
    if(!sc||!sc.enabled)return;
    const tm=announcementScheduleTiming(sc,now);if(!tm||tm.due>now)return;
    if(sc.mode==="weekly"&&tm.event<=now)return;
    if(sc.lastCycle===tm.cycle)return;
    sc.lastCycle=tm.cycle;sc.lastFiredAt=now.toISOString();
    if(sc.mode==="once")sc.enabled=false;
    const eventLine=sc.mode==="weekly"?"\n\n⏰ 活動時間："+tm.event.toLocaleString("zh-TW",{hour12:false}):"";
    addAnnouncement(sc.title,sc.content+eventLine,{scheduled:true,scheduleId:sc.id});fired++;
  });
  return fired;
}
window.setInterval(()=>{
  if(document.visibilityState==="hidden"||(CLOUD.role!=="teacher"&&CLOUD.on()))return;
  const n=runAnnouncementSchedules();
  if(n&&view.page==="teacher"){toast("⏱ 已自動發布 "+n+" 則排程公告");render();}
},60000);
/* 費用:第1次免費鼓勵看公告,之後遞增(金幣銷毀機制) */

function cardItemPrize(id){ return (s)=>{ s.consumables=s.consumables||{}; s.consumables[id]=(s.consumables[id]||0)+1; return "獲得「"+itemById(id).name+"」×1"; }; }
function cardBlueprintPrize(tier){ return (s)=>{ const t=BP_TYPES[Math.floor(Math.random()*BP_TYPES.length)], ti=tierInfo(tier), k=bpKey(t,tier); s.blueprints[k]=(s.blueprints[k]||0)+1; return "獲得【"+ti.icon+ti.name+"・"+TYPE_NAME[t]+"設計圖紙】!"; }; }
const WHEEL_PRIZES = [
  {label:"+8 金", icon:"💰", w:18, rar:"common", apply:s=>{const g=creditGold(s,8,"命運卡包",true);return "金幣 +"+g;}},
  {label:"+8 XP", icon:"✨", w:16, rar:"common", apply:s=>{grantXp(s,8);return "XP +8";}},
  {label:"回復藥水", icon:"🧪", w:13, rar:"common", apply:cardItemPrize(12)},
  {label:"+25 金", icon:"💰", w:12, rar:"adv", apply:s=>{const g=creditGold(s,25,"命運卡包",true);return "金幣 +"+g;}},
  {label:"+20 XP", icon:"📚", w:11, rar:"adv", apply:s=>{grantXp(s,20);return "XP +20";}},
  {label:"幸運草", icon:"🍀", w:7, rar:"adv", apply:cardItemPrize(13)},
  {label:"智慧卷軸", icon:"📖", w:6, rar:"adv", apply:cardItemPrize(14)},
  {label:"+80 金", icon:"💰", w:5, rar:"rare", apply:s=>{const g=creditGold(s,80,"命運卡包",true);return "稀有金幣袋 +"+g+"!";}},
  {label:"高級圖紙", icon:"📘", w:4, rar:"rare", kind:"blueprint", apply:cardBlueprintPrize("advanced")},
  {label:"洗技藥水", icon:"🧴", w:2, rar:"rare", apply:cardItemPrize(24)},
  {label:"傳說圖紙", icon:"📙", w:.18, rar:"legend", kind:"blueprint", apply:cardBlueprintPrize("legend")},
  {label:"寵物卡", icon:"🐉", w:.07, rar:"legend", apply:cardItemPrize(33)},
];
/* 🃏 卡包稀有度特效定義 */

function grantXp(s, xp){
  const ups = applyLevelUps(s, xp);
  progAddXp(xp);                                             // 每日探索進度(取代舊班級目標)
  const wk = lbWeekKey();
  if(!state.xpWeek || state.xpWeek.key!==wk) state.xpWeek = {key:wk, sum:0};
  state.xpWeek.sum += xp;
  if(ups){ levelUpFx(s.name+" 升至 Lv."+s.level+"!"); sfx("levelup"); }
  checkClassGoal();
  classUnlockSync(false);
}
/* 募集:同轉盤機率抽獎,但圖紙固定普通級(不給高級以上),獎勵直接進該隊友背包 */
function grantMuster(s){
  const total = WHEEL_PRIZES.reduce((a,p)=>a+p.w, 0);
  let r = Math.random()*total, i=0;
  for(; i<WHEEL_PRIZES.length; i++){ r -= WHEEL_PRIZES[i].w; if(r<=0) break; }
  if(i >= WHEEL_PRIZES.length) i = WHEEL_PRIZES.length-1;
  const prize = WHEEL_PRIZES[i];
  if(prize.kind==="blueprint"){          // 募集圖紙固定普通級
    const t = BP_TYPES[Math.floor(Math.random()*BP_TYPES.length)];
    const k = bpKey(t, "common");
    s.blueprints[k] = (s.blueprints[k]||0) + 1;
    return "募得【普通・"+TYPE_NAME[t]+"設計圖紙】!";
  }
  return prize.apply(s);
}
function spinInfo(s){
  const today = todayStr();
  if(s.spinDate !== today){ s.spinDate = today; s.spinCount = 0; }
  const month=today.slice(0,7);
  if(s.gachaMonth!==month){s.gachaMonth=month;s.gachaMonthCount=0;s.gachaMonthLegends=0;}
  return {
    count: s.spinCount,
    cost: s.spinCount < SPIN_MAX ? SPIN_COSTS[s.spinCount] : null,
    left: SPIN_MAX - s.spinCount,
    readOk: s.readDate === today,
  };
}

function spinPrizeRoll(minRarity){
  const min=GACHA_RANK[minRarity||"common"]||0;
  const pool=WHEEL_PRIZES.map((p,i)=>({p,i})).filter(x=>(GACHA_RANK[x.p.rar]||0)>=min);
  const total=pool.reduce((a,x)=>a+x.p.w,0);let r=Math.random()*total;
  for(const x of pool){r-=x.p.w;if(r<=0)return x.i;}
  return pool.length?pool[pool.length-1].i:WHEEL_PRIZES.length-1;
}
function gachaGuarantee(s,drawNo){
  const rare=Math.max(0,Math.floor(Number(s.gachaPityRare)||0));
  const legend=Math.max(0,Math.floor(Number(s.gachaPityLegend)||0));
  const monthCount=Math.max(0,Math.floor(Number(s.gachaMonthCount)||0))+1;
  const monthLegends=Math.max(0,Math.floor(Number(s.gachaMonthLegends)||0));
  if(monthCount>=100&&monthLegends<2)return {min:"legend",label:"本月第 2 件傳說保底"};
  if(monthCount>=50&&monthLegends<1)return {min:"legend",label:"本月第 1 件傳說保底"};
  if(legend>=99)return {min:"legend",label:"100 抽傳說保底"};
  if(rare>=49)return {min:"rare",label:"50 抽稀有保底"};
  if(drawNo===3)return {min:"adv",label:"今日第 3 抽進階保底"};
  return {min:"common",label:""};
}
function updateGachaPity(s,rarity){
  const rank=GACHA_RANK[rarity]||0;
  s.gachaPityRare=rank>=2?0:Math.max(0,Math.floor(Number(s.gachaPityRare)||0))+1;
  s.gachaPityLegend=rank>=3?0:Math.max(0,Math.floor(Number(s.gachaPityLegend)||0))+1;
  s.gachaMonthCount=Math.max(0,Math.floor(Number(s.gachaMonthCount)||0))+1;
  if(rank>=3)s.gachaMonthLegends=Math.max(0,Math.floor(Number(s.gachaMonthLegends)||0))+1;
}
function doSpin(sid){
  const s = stu(sid); if(!s) return null;
  const info = spinInfo(s);
  if(!info.readOk || info.left<=0) return null;
  const cost = info.cost || 0;
  if(cost > 0 && s.gold < cost) return null;
  debitGold(s,cost,"命運卡包");
  state.goldBurned = (state.goldBurned||0) + cost;   // 金幣銷毀統計
  s.spinCount++;
  const guarantee=gachaGuarantee(s,s.spinCount),i=spinPrizeRoll(guarantee.min),prize=WHEEL_PRIZES[i];
  let msg = prize.apply(s);
  updateGachaPity(s,prize.rar);
  if(guarantee.label)msg+="（"+guarantee.label+"觸發）";
  addLog(sid, "🃏 命運卡包第 "+s.spinCount+" 抽"+(cost?"(花費 "+cost+" 金)":"(免費)")+":"+msg);
  checkAchievements(s);
  save();
  return {i, msg,guarantee:guarantee.label,pityRare:s.gachaPityRare,pityLegend:s.gachaPityLegend};
}
async function doSpinOnline(sid){
  const result=await CLOUD.spinCard();
  if(!result||!result.student)throw new Error("抽卡結果不完整");
  const i=state.students.findIndex(x=>String(x.id)===String(sid));
  if(i>=0)state.students[i]=result.student;
  CLOUD._lastSnap["stu:"+sid]=JSON.stringify(result.student);
  classUnlockSync(false);
  return {i:Number(result.prizeIndex)||0,msg:String(result.message||"獲得獎勵"),guarantee:String(result.guarantee||""),pityRare:Number(result.pityRare)||0,pityLegend:Number(result.pityLegend)||0};
}
function wheelHtml(){
  const segC = ["#2a3350","#39456e"];
  const deg=360/WHEEL_PRIZES.length;
  const grads = WHEEL_PRIZES.map((p,i)=> segC[i%2]+" "+(i*deg)+"deg "+((i+1)*deg)+"deg").join(",");
  const labels = WHEEL_PRIZES.map((p,i)=>
    '<span class="wseg" style="transform:rotate('+(i*deg+deg/2)+'deg) translateY(-98px)">'+p.icon+'<br>'+p.label+'</span>').join("");
  return '<div class="wheel-outer"><div class="wheel-pointer">▼</div>'
    + '<div class="wheel" id="wheelEl" style="background:conic-gradient('+grads+')">'+labels
    + '<div class="wheel-hub">🎡</div></div></div>';
}

/* ── 音效(WebAudio,離線可用)─────────────────────── */
let soundOn = true, audioCtx = null;
function beep(freq, dur, type, delay){
  if(!soundOn) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    const t = audioCtx.currentTime + (delay||0);
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type||"triangle"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t+dur);
  }catch(e){ /* 無音效環境,略過 */ }
}
function sfx(kind){
  if(kind==="award"){ beep(660,.12); beep(880,.12,"triangle",.1); }
  else if(kind==="levelup"){ beep(523,.14); beep(659,.14,"triangle",.12); beep(784,.2,"triangle",.24); beep(1047,.3,"triangle",.4); }
  else if(kind==="buy"){ beep(740,.1,"square"); beep(988,.12,"square",.09); }
  else if(kind==="chest"){ beep(392,.1); beep(523,.1,"triangle",.1); beep(659,.16,"triangle",.2); }
  else if(kind==="achieve"){ beep(880,.1); beep(1175,.18,"triangle",.1); }
  else if(kind==="goal"){ [523,659,784,1047,784,1047].forEach((f,i)=>beep(f,.16,"triangle",i*.12)); }
}

/* ── 視覺回饋 ─────────────────────────────────────── */
function floatFx(text, x, y, color){
  const el = document.createElement("div");
  el.className = "float-fx"; el.textContent = text;
  el.style.left = (x-20)+"px"; el.style.top = (y-24)+"px"; el.style.color = color;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 1200);
}
function levelUpFx(text){
  const el = document.createElement("div");
  el.className = "lvup-fx"; el.innerHTML = '<div class="txt">'+esc(text)+'</div>';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 1700);
}
/* 漫畫風技能對話框:佇列依序播放,每個停留讓學生看清 */
const _cpQueue = [];
let _cpPlaying = false;
/* text:文字 style:形狀 color:顏色 anchor:CSS選擇器(定位到該元素上方,省略=螢幕中央) */
function comicPop(text, style, color, anchor){
  _cpQueue.push({text, style:style||"boom", color, anchor});
  if(!_cpPlaying) _cpDrain();
}
function _cpDrain(){
  if(!_cpQueue.length){ _cpPlaying = false; return; }
  _cpPlaying = true;
  const {text, style, color, anchor} = _cpQueue.shift();
  const el = document.createElement("div");
  el.className = "comic-pop cp-" + style;
  if(color) el.style.setProperty("--cp", color);
  el.innerHTML = '<span>'+esc(text)+'</span>';
  // 錨定:浮在目標元素上方中央
  let anchored = false;
  if(anchor){
    const target = document.querySelector(anchor);
    if(target){
      const r = target.getBoundingClientRect();
      el.classList.add("cp-anchored");
      el.style.left = (r.left + r.width/2) + "px";
      el.style.top = Math.max(8, r.top - 6) + "px";
      anchored = true;
    }
  }
  document.body.appendChild(el);
  const SHOW = anchored ? 550 : 650;      // v124:縮短彈框存活,戰場快節奏不積壓
  setTimeout(()=>{ el.remove(); setTimeout(_cpDrain, anchored ? 60 : 80); }, SHOW);
}
/* 技能 id → 對話框樣式對照 */

/* ══ 職業技能組相剋(競技場＋戰場) ═══════════════════
 * 克制只由「已裝備且實際發動」的技能形成，不直接綁死職業傷害：
 * ⚔️ 戰士壓制技 → 神官治療封鎖／削弱守護
 * ✨ 牧師聖盾與淨化 → 抵抗法術／解除元素控制
 * 🔮 法師命中法術 → 無視敏捷閃避／擾亂遊俠行動條
 * 💨 遊俠疾閃技能 → 提高對戰士物攻閃避上限／閃避後搶先行動 */
/* 職業互剋改採「技能組」而非四職業固定轉圈：戰士破牧、牧師抗法、法師必中遊俠、遊俠閃戰士。 */
function hasAdvantage(){ return false; } // 保留舊逆境之魂呼叫點，但不再套用舊式四角循環相剋。
/* 特性數值(模擬調參用,集中管理) */

/* 競技場職業平衡係數(1v1與團隊打王的平衡需求不同,僅競技場適用;真裸裝條件校準) */
   // v114 主屬性制:俠 agi 全額進傷害(原1.45為低傷補償)
   // 戰場節奏係數:競技場全體傷害倍率(調高=戰鬥更快分勝負)
/* 競技場屬性軟化:「裝備」提供的 atk/def 在競技場收益減半,
 * 基礎值與等級成長不受影響——防止全班買裝後傷害膨脹打壞職業平衡;Boss 戰不動 */
/* 高等級戰鬥採「成長傷害＋遞減防禦」：攻擊隨主屬性穩定成長，防禦越高收益越小且最多減傷 55%，避免 Lv.60～90 互相刮痧。 */
function arenaDmgMult(s){ const k=mainStatOf(s),e=equipStatSum(s),main=Math.max(0,totalStats(s)[k]-(e[k]||0)*.5-10); return 1+main/(main+85)*2.2; }
function arenaDefMult(s){ const e=equipStatSum(s),def=Math.max(0,totalStats(s).def-e.def*.5-10),reduction=Math.min(.58,def/(def+130)); return 1-reduction; }
function isMagicSpell(att,skillId){ return !!(att && att.job==='Mage' && skillId); }

function equippedCounterLv(s,ids){ return !s?0:ids.reduce((n,id)=>n+activeSkillLv(s,id),0); }
function counterTier(s,skillId){ const sk=s&&skillDef(s.job,skillId); return sk?(sk.tier||1):1; }
function warriorSuppressionProfile(att,dfd,skillId){
  if(!att||!dfd||att.job!=='Warrior'||dfd.job!=='Cleric'||!COUNTER_SKILL_SETS.warrior.includes(skillId)||activeSkillLv(att,skillId)<=0) return {active:false,turns:0,strip:0};
  const tier=counterTier(att,skillId);
  return {active:true,tier,turns:tier>=3?8:tier===2?6:4,strip:tier>=3?3:tier===2?2:1};
}
function clericMagicProfile(dfd){
  const wardLv=dfd&&dfd.job==='Cleric'?equippedCounterLv(dfd,COUNTER_SKILL_SETS.clericWard):0;
  const resolveLv=dfd&&dfd.job==='Cleric'?equippedCounterLv(dfd,COUNTER_SKILL_SETS.clericResolve):0;
  return {wardLv,resolveLv,ward:wardLv?Math.min(.38,.08+wardLv*.022):0};
}
function mageRogueProfile(att,dfd,skillId){
  if(!isMagicSpell(att,skillId)||!dfd||dfd.job!=='Rogue'||activeSkillLv(att,skillId)<=0) return {active:false,drain:0,tier:1};
  const tier=counterTier(att,skillId);
  return {active:true,tier,drain:tier>=3?34:tier===2?22:12};
}
function rogueWarriorProfile(att,dfd){
  if(!att||!dfd||att.job!=='Warrior'||dfd.job!=='Rogue') return {active:false,gain:0,lv:0};
  const lv=equippedCounterLv(dfd,COUNTER_SKILL_SETS.rogueTempo);
  return {active:lv>0,lv,gain:Math.min(42,12+lv*2)};
}
function gaRogueCounterStep(att,dfd,attacker,target){
  const rp=rogueWarriorProfile(att,dfd); if(!rp.active||!attacker||!target) return false;
  target.atb=Math.min(160,(target.atb||0)+rp.gain);
  target.bAgiT=Math.max(target.bAgiT||0,2);
  const sx=Math.sign(target.x-attacker.x), sy=Math.sign(target.y-attacker.y);
  const tries=Math.abs(target.x-attacker.x)>=Math.abs(target.y-attacker.y)?[[sx,0],[0,sy],[0,sy||1],[0,sy||-1]]:[[0,sy],[sx,0],[sx||1,0],[sx||-1,0]];
  for(const d of tries){
    const nx=target.x+d[0],ny=target.y+d[1];
    if(!d[0]&&!d[1]||nx<0||nx>=GARENA.W||ny<0||ny>=GARENA.H||gaIsBlocked(nx,ny)) continue;
    if(Object.values(GARENA.fighters).some(o=>!o.ko&&o.sid!==target.sid&&o.x===nx&&o.y===ny)) continue;
    target.x=nx;target.y=ny;gaSetFacing(target,d[0]>0?'right':d[0]<0?'left':d[1]>0?'down':'up');break;
  }
  counterSkillFx('rogue','[data-gfighter="'+target.sid+'"]');
  comicPop('疾風反步!','cloud','#79e2bd','[data-gfighter="'+target.sid+'"]');
  garenaLog('💨 '+dfd.name+' 的疾閃技能避開戰士物攻，後撤並取得 '+rp.gain+'% 行動條！');
  return true;
}
function gaApplyArcaneLock(att,dfd,target,skillId){
  const mp=mageRogueProfile(att,dfd,skillId); if(!mp.active||!target||(target.arcaneLockCd||0)>0) return false;
  const old=Math.round(target.atb||0);
  target.atb=Math.max(0,(target.atb||0)-mp.drain); target.stealth=0; target.arcaneLockCd=3;
  counterSkillFx('mage','[data-gfighter="'+target.sid+'"]');
  comicPop('奧術鎖定!','boom','#9b8cff','[data-gfighter="'+target.sid+'"]');
  garenaLog('🔮 '+att.name+' 的法術看穿 '+dfd.name+' 的殘影，清除隱身並擾亂 '+Math.min(old,mp.drain)+'% 行動條！');
  return true;
}
function gaTryHolyResolve(att,dfd,target,skillId){
  const cp=clericMagicProfile(dfd);
  if(!isMagicSpell(att,skillId)||!target||cp.resolveLv<=0||(target.holyResolveCd||0)>0) return false;
  const controlled=(target.chillT||0)>0||(target.frozenT||0)>0||(target.silenceT||0)>0||(target.stuckT||0)>0;
  if(!controlled) return false;
  target.chillT=0;target.frozenT=0;target.silenceT=0;target.stuckT=0;target.holyResolveCd=Math.max(8,16-Math.min(8,cp.resolveLv));
  target.bDefT=Math.max(target.bDefT||0,3);
  counterSkillFx('cleric','[data-gfighter="'+target.sid+'"]');
  comicPop('聖光解厄!','cloud','#ffe38a','[data-gfighter="'+target.sid+'"]');
  garenaLog('✨ '+dfd.name+' 的淨化技能回應法術命中：解除控制並獲得短暫防護！');
  return true;
}
function combatDodgeChance(att,dfd,skillId){
  if(isMagicSpell(att,skillId)) return 0;
  const rp=rogueWarriorProfile(att,dfd);
  const bonus=rp.active?Math.min(TRAIT_TUNE.rogueVsWarriorDodge,rp.lv*.8):0;
  return Math.min(rp.active?45:(dfd&&dfd.job==='Rogue'?37:25),agiDodge(dfd)+bonus);
}
function jobCounterDamage(att,dfd,skillId,dmg){
  const labels=[]; let out=dmg;
  if(isMagicSpell(att,skillId)&&dfd.job==='Cleric'){
    const cp=clericMagicProfile(dfd);
    if(cp.ward>0){ out=Math.max(1,Math.round(out*(1-cp.ward))); labels.push('✨聖盾抗法'); }
  }
  return {dmg:out,label:labels.join('+')};
}
function warriorSuppressesHealing(att,dfd,skillId){
  return warriorSuppressionProfile(att,dfd,skillId).active;
}
/* 舊式獨立大招已退場：威力改由 Lv.60 三轉技能樹中的傳說專精提供。 */

   // 競技場大招傷害上限:對方最大HP的35%(防秒殺,Boss戰不設限)
function ultReady(s){ return false; }
/* 1v1 也直接抽取「已裝備」的二、三轉戰技；先前只讀一轉技能，會造成高等角色看不到技能動畫。 */

function arenaSkillIsUltimate(s,id){return (ADVANCE_ULTIMATES[s.job]||[]).some(u=>u.id===id);}
function arenaSkillSupportType(sk){
  if(!sk)return "";const id=sk.id||"";
  if(sk.branch==="heal"||sk.effect==="heal"||/renewal|healing_wave|miracle|prayer|resurrection|holy_sprite/.test(id))return "heal";
  if(sk.kind==="def"||sk.effect==="ward"||/shield|armor|guard|aegis|sanctuary|fortress|cleanse/.test(id))return "ward";
  if(sk.effect==="tempo"||/surge|overflow|step|wings/.test(id))return "tempo";
  return "";
}
function arenaSkillMult(s,sk){
  if(!sk)return 1;
  if(ARENA_BASE_SKILL_MULT[sk.id])return ARENA_BASE_SKILL_MULT[sk.id];
  const listed=(ARENA_ADV_SKILLS[s.job]||[]).find(x=>x[0]===sk.id);if(listed)return listed[1];
  if(arenaSkillIsUltimate(s,sk.id))return 2.15+activeSkillLv(s,sk.id)*.08;
  const v=skillVal(s,sk.id);if((ADVANCE_ATTACK_RULES[sk.id]||ADVANCE_TACTIC_RULES[sk.id])&&v>=1&&v<=4)return v;
  const support=arenaSkillSupportType(sk);if(support)return support==="heal"?.72:.9;
  return sk.kind==="atk"?1.3:1;
}
/* 1v1 直接讀五格裝備技能。每回合只選一招、只讓該招進冷卻；連續兩次普攻後保證施放可用技能。 */
function arenaPickEquippedSkill(s,side,hpPct){
  const dry=ARENA[side==="A"?"skillDryA":"skillDryB"]||0;
  const ready=normalizeSkillLoadout(s).map(id=>skillDef(s.job,id)).filter(sk=>sk&&activeSkillLv(s,sk.id)>0&&!skillCooldownActive('arena',s.id,sk.id)&&(sk.kind!=="passive"||arenaSkillIsUltimate(s,sk.id)));
  const useful=ready.filter(sk=>arenaSkillSupportType(sk)!=="heal"||hpPct<.95),list=useful.length?useful:ready.filter(sk=>arenaSkillSupportType(sk)!=="heal");
  if(!list.length)return null;
  const scored=list.map(sk=>{const support=arenaSkillSupportType(sk),tier=sk.tier||1,lv=activeSkillLv(s,sk.id);let score=tier*20+lv*3+arenaSkillMult(s,sk)*8;
    if(s.job==="Cleric"&&support==="heal")score+=(1-hpPct)*120;if(support==="heal"&&hpPct>.92)score-=55;if(support==="ward"&&hpPct<.7)score+=24;return {sk,score};}).sort((a,b)=>b.score-a.score);
  const pick=scored[0].sk,base=(pick.chance&&pick.chance[Math.max(0,activeSkillLv(s,pick.id)-1)])||18;
  const clericEmergency=s.job==="Cleric"&&hpPct<.8&&arenaSkillSupportType(pick)==="heal"&&dry>=1;
  if(dry<1&&!clericEmergency&&Math.random()*100>=Math.min(78,base+intSkillBonus(s)))return null;
  startSkillCooldown('arena',s,pick.id,arenaSkillCooldownSeconds(s,pick.id));return pick;
}
function arenaSkillHealAmount(s,sk,maxHp){
  if(!sk)return 0;const id=sk.id,lv=activeSkillLv(s,id),v=skillVal(s,id)||0;
  if(id==="miracle_sanctum"||id==="resurrection_hymn")return Math.round(maxHp*(.22+lv*.02));
  if(id==="heal"||id==="groupheal")return Math.max(1,Math.round(v*advancementHealMult(s)));
  return Math.max(8,Math.round(maxHp*(.08+Math.min(12,v)/100)*advancementHealMult(s)));
}
/* 大招全屏特效:白閃+大粒子環爆+特大招式名 */
function ultFxPlay(job, anchorSel){
  const u = ULT_DEFS[job]; if(!u) return;
  const flash = document.createElement("div");
  flash.className = "ult-flash";
  document.body.appendChild(flash);
  setTimeout(()=>flash.remove(), 650);
  const banner = document.createElement("div");
  banner.className = "ult-banner";
  banner.style.setProperty("--uc", u.color);
  banner.textContent = u.emoji+" "+u.name+" "+u.emoji;
  document.body.appendChild(banner);
  setTimeout(()=>banner.remove(), 1400);
  const target = anchorSel && document.querySelector(anchorSel);
  if(target){
    const r = target.getBoundingClientRect();
    const wrap = document.createElement("div");
    wrap.className = "sfx-wrap";
    wrap.style.left = (r.left+r.width/2)+"px"; wrap.style.top = (r.top+r.height/2)+"px";
    for(let i=0;i<12;i++){
      const pt = document.createElement("span");
      pt.className = "sfx sfx-burst";
      pt.style.fontSize = "44px";
      pt.textContent = u.emoji;
      const ang=(i/12)*6.283;
      pt.style.setProperty("--dx", Math.cos(ang)*95+"px");
      pt.style.setProperty("--dy", Math.sin(ang)*80+"px");
      wrap.appendChild(pt);
    }
    document.body.appendChild(wrap);
    setTimeout(()=>wrap.remove(), 1100);
  }
}
/* ══ 技能特效動畫(Boss戰+競技場共用) ══════════════
 * pattern:burst爆發/slash斜閃/fall天降/rise上升/bolt閃電/ring音波環/shieldfx護罩 */

function skillElementFx(id){
  for(const [element,ids] of Object.entries(ELEMENT_SKILL_FX)) if(ids.has(id)) return element;
  return '';
}
function skillFxPlay(id, anchorSel, sourceId){
  const fx = SKILL_FX[id]; if(!fx || !fx.emoji) return;
  const target = anchorSel && document.querySelector(anchorSel);
  if(!target) return;
  const legendActor=target.matches('.ga-fighter,.ar-doll')?target:target.closest('.ga-fighter,.ar-doll');
  if(legendActor&&legendActor.querySelector('.legend-doll')){
    legendActor.classList.remove('legend-cast'); void legendActor.offsetWidth;
    legendActor.classList.add('legend-cast'); clearTimeout(legendActor._legendCastT);
    legendActor._legendCastT=setTimeout(()=>legendActor.classList.remove('legend-cast'),760);
  }
  const r = target.getBoundingClientRect();
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  const visualId=sourceId||id;
  const tier=Math.max(1,...Object.keys(SKILL_TREES).map(job=>{ const sk=(SKILL_TREES[job]||[]).find(x=>x.id===visualId); return sk?(sk.tier||1):1; }));
  const element=skillElementFx(visualId)||skillElementFx(id);
  const elementColor={fire:'#ff652b',thunder:'#8f7aff',ice:'#8ce4ff',wind:'#55d7b6'}[element];
  const effectColor=elementColor||fx.color;
  const wrap = document.createElement("div");
  wrap.className = "sfx-wrap sfx-tier"+tier+(element?' sfx-element sfx-el-'+element:'');
  wrap.style.left = cx + "px"; wrap.style.top = cy + "px"; wrap.style.setProperty("--sc",effectColor);
  const crowded=GARENA && GARENA.active && (Object.keys(GARENA.fighters||{}).length>12 || (GARENA.speed||1)>1);
  if(element){
    const seal=document.createElement('i'); seal.className='sfx-element-seal'; wrap.appendChild(seal);
    const elementN=crowded?2:(tier===3?7:tier===2?5:3);
    for(let i=0;i<elementN;i++){
      const piece=document.createElement('i'); piece.className='sfx-element-piece';
      piece.style.setProperty('--delay',(i*(element==='thunder'?34:48))+'ms');
      piece.style.setProperty('--px',((i-(elementN-1)/2)*(element==='thunder'?20:18))+'px');
      piece.style.setProperty('--rot',((i/elementN)*360)+'deg');
      wrap.appendChild(piece);
    }
  }
  const baseN=(fx.pattern==="slash" ? 1 : fx.pattern==="shieldfx" ? 1 : fx.pattern==="fall" ? 3 : fx.pattern==="bolt" ? 4 : 6);
  const N = crowded ? 1 : element ? Math.max(1,tier) : baseN + (tier===3 ? 6 : tier===2 ? 1 : 0);
  for(let i=0;i<N;i++){
    const p = document.createElement("span");
    p.className = "sfx sfx-" + fx.pattern;
    p.textContent = fx.emoji;
    p.style.setProperty("--sc", effectColor);
    if(tier>1) p.style.fontSize=(tier===3?1.32:1.14)*(fx.pattern==="slash"?70:fx.pattern==="shieldfx"?72:32)+"px";
    if(fx.pattern==="burst"){ const ang=(i/N)*6.283; p.style.setProperty("--dx", Math.cos(ang)*52+"px"); p.style.setProperty("--dy", Math.sin(ang)*44+"px"); }
    if(fx.pattern==="rise"){ p.style.setProperty("--dx", ((i-N/2)*16)+"px"); p.style.animationDelay = (i*70)+"ms"; }
    if(fx.pattern==="fall"){ p.style.setProperty("--dx", ((i-1)*30)+"px"); p.style.animationDelay = (i*110)+"ms"; }
    if(fx.pattern==="bolt"){ p.style.setProperty("--dx", ((i-1.5)*20)+"px"); p.style.animationDelay = (i*50)+"ms"; }
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(()=> wrap.remove(), tier===3?1250:1000);
}
/* 克制觸發採短促的印記、光環與碎光，保留高級感但避免全畫面粒子拖慢多人戰。 */
function counterSkillFx(kind,anchorSel){
  const target=anchorSel&&document.querySelector(anchorSel); if(!target) return;
  const meta={warrior:['✦','#ff775f'],cleric:['✧','#ffe38a'],mage:['◇','#9b8cff'],rogue:['◈','#79e2bd']}[kind]||['✦','#fff'];
  const r=target.getBoundingClientRect(),wrap=document.createElement('div');
  wrap.className='counter-fx counter-fx-'+kind; wrap.style.left=(r.left+r.width/2)+'px'; wrap.style.top=(r.top+r.height*.48)+'px'; wrap.style.setProperty('--cc',meta[1]);
  const core=document.createElement('span'); core.className='counter-fx-core'; core.textContent=meta[0]; wrap.appendChild(core);
  const crowded=GARENA&&GARENA.active&&(Object.keys(GARENA.fighters||{}).length>12||(GARENA.speed||1)>1), n=crowded?3:6;
  for(let i=0;i<n;i++){ const p=document.createElement('i'),ang=i/n*Math.PI*2; p.className='counter-fx-spark'; p.style.setProperty('--dx',(Math.cos(ang)*48)+'px');p.style.setProperty('--dy',(Math.sin(ang)*38)+'px');p.style.setProperty('--delay',(i*28)+'ms');wrap.appendChild(p); }
  document.body.appendChild(wrap); setTimeout(()=>wrap.remove(),900);
}
/* 傷害/治療數字：以「傷害÷目標最大生命」分級；kind="crit" 僅由實際爆擊判定傳入。 */
function damageAnchorMaxHp(anchorSel){
  if(!anchorSel) return 0;
  if(typeof ARENA!=="undefined"){
    if(anchorSel==="#dollA") return +ARENA.maxA||0;
    if(anchorSel==="#dollB") return +ARENA.maxB||0;
  }
  const gm=String(anchorSel).match(/data-gfighter=["']([^"']+)["']/);
  if(gm && typeof GARENA!=="undefined"){
    const f=(GARENA.fighters||{})[gm[1]]; if(f) return +f.max||0;
  }
  const cm=String(anchorSel).match(/data-charwall=["']([^"']+)["']/);
  if(cm && typeof stu==="function"){
    const s=stu(cm[1]); if(s) return (+s.maxHp||0)+(typeof skillMaxHpBonus==="function"?skillMaxHpBonus(s):0);
  }
  return 0;
}
function dmgPop(val, anchorSel, kind, meta){
  // 大型團戰只保留關鍵傷害/治療數字，避免數十個 DOM 動畫同時排隊。
  if(GARENA && GARENA.active && (Object.keys(GARENA.fighters||{}).length>12 || (GARENA.speed||1)>1)){
    const now=Date.now();
    if(!GARENA._fxWindow || now-GARENA._fxWindow>500){ GARENA._fxWindow=now; GARENA._fxCount=0; }
    GARENA._fxCount=(GARENA._fxCount||0)+1;
    if(GARENA._fxCount>8 && Math.abs(+val||0)<15) return;
  }
  const target = anchorSel && document.querySelector(anchorSel);
  if(!target) return;
  const r = target.getBoundingClientRect();
  const el = document.createElement("div");
  const n = Math.abs(+val)||0;
  const opt=(meta && typeof meta==="object")?meta:{crit:meta===true};
  const isDamage=kind==="dmg"||kind==="crit";
  const critical=kind==="crit"||!!opt.crit;
  const maxHp=Math.max(0,+opt.maxHp||damageAnchorMaxHp(anchorSel));
  const ratio=maxHp>0?n/maxHp:0;
  let cls="dmg-s";
  if(isDamage){
    if(critical) cls="dmg-crit";
    else if((maxHp>0 && ratio>=.18) || (!maxHp && n>=50)) cls="dmg-l";
    else if((maxHp>0 && ratio>=.08) || (!maxHp && n>=20)) cls="dmg-m";
  }
  const mini = anchorSel.indexOf("gfighter") >= 0;      // 團體戰場:縮小到人物尺度,浮頭頂
  el.className = "dmg-pop " + (kind==="heal"?"dmg-heal":kind==="block"?"dmg-block":cls) + (mini?" dmg-mini":"");
  el.textContent = (kind==="heal"?"+":"-") + n + (critical?"!":"");
  if(critical) el.dataset.crit="爆擊";
  const ox = mini ? (Math.random()*20 - 10) : (Math.random()*44 - 22);
  const oy = mini ? (Math.random()*8 - 4) : (Math.random()*14 - 7);
  el.style.left = (r.left + r.width/2 + ox) + "px";
  el.style.top  = (Math.max(8, r.top - (mini?2:4) + oy)) + "px";
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 950);
}
function skillPop(id, anchor){
  skillFxPlay(id, anchor);                                  /* Boss戰:特效跟著技能對話框 */
  const p = SKILL_POP[id]; if(!p) return;
  comicPop(p[0], p[1], p[2], anchor);
}
function toast(msg, isErr){
  const w = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast" + (isErr ? " err" : "");
  el.textContent = msg;
  w.appendChild(el);
  setTimeout(()=>el.remove(), 2600);
}
function esc(t){ return String(t).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

/* ── 匯出 / 匯入 ──────────────────────────────────── */
function canonicalJson(value){
  const sort=v=>Array.isArray(v)?v.map(sort):(v&&typeof v==="object"?Object.keys(v).sort().reduce((o,k)=>{o[k]=sort(v[k]);return o;},{}):v);
  return JSON.stringify(sort(value));
}
function validateClassBackup(payload){
  if(!payload||typeof payload!=="object"||Array.isArray(payload))throw new Error("檔案不是班級備份");
  if(!Array.isArray(payload.students))throw new Error("缺少學生角色資料");
  if(payload.students.length>500)throw new Error("學生數超過安全上限 500 人");
  const ids=new Set(),snos=new Set();
  payload.students.forEach((s,i)=>{
    if(!s||typeof s!=="object")throw new Error("第 "+(i+1)+" 筆學生資料格式錯誤");
    const id=String(s.id||"").trim(),name=String(s.name||"").trim(),sno=String(s.sno||"").trim();
    if(!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw new Error("第 "+(i+1)+" 筆角色 ID 錯誤");
    if(!name||name.length>40)throw new Error("角色 "+id+" 的姓名錯誤");
    if(ids.has(id))throw new Error("角色 ID 重複："+id);ids.add(id);
    if(sno){if(snos.has(sno))throw new Error("學號重複："+sno);snos.add(sno);}
  });
  for(const key of ["customItems","submissions"]){if(payload[key]!==undefined&&!Array.isArray(payload[key]))throw new Error(key+" 格式錯誤");}
  const info=payload._backup||{};
  if(info.students!==undefined&&Number(info.students)!==payload.students.length)throw new Error("備份摘要與學生人數不一致");
  return info;
}
async function exportData(alsoEmail){
  try{
    const plain=JSON.parse(JSON.stringify(state)),digest=await sha256Hex(canonicalJson(plain));
    const payload=Object.assign({},plain,{_backup:{schema:2,version:"v126",app:"班級RPG-班級完整備份",at:new Date().toISOString(),
      sourceCid:String(CLOUD.cid||""),className:state.className||state.lbName||"",students:(state.students||[]).length,
      customItems:(state.customItems||[]).length,submissions:(state.submissions||[]).length,exportedBy:(FB.user&&FB.user.email)||"",digest}});
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const d = new Date();
    const cn = (state.className||state.lbName||"班級").replace(/[\\/:*?"<>|]/g,"");
    const stamp = d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0")
                + "-"+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0");
    a.download = "班級RPG備份-"+cn+"-"+stamp+".json";
    document.body.appendChild(a);        // 部分瀏覽器需在 DOM 內才能觸發
    a.click();
    setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);  // 延後撤銷,確保下載開始
    try{ localStorage.setItem("rpg-last-backup", new Date().toISOString()); }catch(_){}
    if(alsoEmail) openBackupMail(a.download);                // 一鍵開郵件草稿
    render();
    toast("✅ 備份已下載:"+a.download);
  }catch(e){
    // 後備:開新視窗顯示 JSON 供手動複製(iPad/受限環境)
    try{
      const w = window.open("", "_blank");
      if(w){ w.document.write("<pre>"+esc(JSON.stringify(state,null,2))+"</pre>"); toast("無法直接下載,已開新視窗顯示備份內容,請自行複製保存", true); }
      else toast("匯出失敗,請改用桌面瀏覽器", true);
    }catch(_){ toast("匯出失敗,請改用桌面瀏覽器", true); }
  }
}
/* 開啟郵件草稿(收件人=教師信箱,提示把剛下載的檔案拖進附件) */
function openBackupMail(filename){
  const to = (FB.user && FB.user.email) || (state.teacherEmails&&state.teacherEmails[0]) || "";
  const cn = state.className || state.lbName || "班級";
  const d = new Date().toLocaleDateString("zh-TW");
  const subject = "【班級RPG備份】"+cn+" "+d;
  const body = "這是「"+cn+"」的班級 RPG 備份。\n\n"
    + "★ 請把剛剛下載的備份檔案:\n   "+filename+"\n手動拖曳／附加到這封信,再寄給自己保存。\n\n"
    + "(下載位置通常在裝置的「下載」資料夾)\n\n"
    + "備份時間:"+new Date().toLocaleString("zh-TW",{hour12:false})+"\n"
    + "學生人數:"+((state.students||[]).length)+" 人";
  const url = "mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
  try{ window.location.href = url; }catch(e){ toast("無法開啟郵件,請手動寄出下載的檔案", true); }
}
function importData(file){
  if(file&&file.size>25*1024*1024){toast("匯入失敗：備份檔超過 25 MB 安全上限",true);return;}
  const r = new FileReader();
  r.onload = async ()=>{
    try{
      const p = JSON.parse(r.result);
      const info=validateClassBackup(p),currentCid=String(CLOUD.cid||""),sourceCid=String(info.sourceCid||"");
      if(CLOUD.on()&&sourceCid&&sourceCid!==currentCid)throw new Error("這是班級 "+sourceCid+" 的備份，不能覆蓋目前班級 "+currentCid+"。請先返回班級選擇頁，進入正確班級再匯入");
      if(CLOUD.on()&&!sourceCid&&String(info.className||p.className||"")!==String(state.className||state.lbName||""))throw new Error("舊版備份沒有班級代碼，且班級名稱與目前班級不同；為避免覆蓋錯班，已停止匯入");
      const plain=JSON.parse(JSON.stringify(p));delete plain._backup;
      if(info.digest&&await sha256Hex(canonicalJson(plain))!==String(info.digest))throw new Error("檔案完整性檢查失敗，可能已損壞或被修改");
      const desc = (info.className?"班級「"+info.className+"」":"備份檔")
                 + "・"+p.students.length+" 名學生"
                 + (info.at?"・"+new Date(info.at).toLocaleString("zh-TW",{hour12:false}):"");
      const here = CLOUD.on() ? ("目前雲端班級「"+(state.className||state.lbName||"")+"」("+state.students.length+" 人)") : ("目前本機班級("+state.students.length+" 人)");
      if(!confirm("確定還原這個班級的完整學生角色資料？\n\n【備份】"+desc+"\n【目前】"+here+"\n【內容】角色 "+p.students.length+" 人、作品 "+(p.customItems||[]).length+" 件、任務回報 "+(p.submissions||[]).length+" 筆\n\n⚠️ 只會覆蓋目前選取的班級，不會影響其他班。建議先匯出目前備份。")) return;
      delete p._backup;
      const previous=state;
      if(CLOUD.on())CLOUD.stopListen();
      state = backfill(p);                                   // 過 backfill:補齊新版欄位,舊備份也能用
      if(CLOUD.on())localStorage.setItem(LS_KEY,JSON.stringify(state));else save();
      if(CLOUD.on()){                                        // 雲端班級:整包回寫雲端
        registrationLoading("正在還原本班資料","正在寫入學生角色、裝備、技能與學習紀錄，請勿關閉頁面…");
        try{
          await CLOUD.pushFull();registrationLoading("正在核對雲端資料","重新讀取每位學生角色與班級索引…");
          const checked=await CLOUD.verifyFullRestore();CLOUD.listen();save();registrationLoadingDone();
          try{localStorage.setItem("rpg-last-backup-restore",new Date().toISOString());}catch(_){}
          render();toast("✅ 本班還原並核對完成："+checked.students+" 名學生、"+checked.items+" 件作品");return;
        }catch(e){
          registrationLoadingDone();state=previous;localStorage.setItem(LS_KEY,JSON.stringify(state));
          try{await CLOUD.loadClass(currentCid,(FB.user&&FB.user.email)||"",{listen:true});}catch(_){}
          throw new Error("雲端還原未通過核對："+(e.message||e)+"。已重新載入目前雲端資料，請勿重複匯入並先檢查網路");
        }
      }
      render();
      toast("✅ 本機班級匯入成功："+state.students.length+" 名學生");
    }catch(e){ toast("匯入失敗:"+(e.message||"檔案不是有效的備份"), true); }
  };
  r.readAsText(file);
}

/* ── UI ───────────────────────────────────────────── */
const app = document.getElementById("app");
const modalHost = document.getElementById("modalHost");
let view = {page:"home", sid:null, tab:"stats", shopFilter:"all", tview:"board", role:null};
function updateSyncStatus(){
  const el=document.getElementById("syncStatus");if(!el)return;
  let status="offline",text="● 本機備份";
  if(CLOUD&&CLOUD.on()){
    status=CLOUD._status||"synced";
    const labels={queued:"● 等待同步",syncing:"↻ 同步中",synced:"✓ 已同步",error:"! 同步失敗"};
    text=labels[status]||"● 雲端連線";
    if(status==="synced"&&CLOUD._lastSyncAt){const d=new Date(CLOUD._lastSyncAt);el.title="最後同步 "+d.toLocaleTimeString("zh-TW",{hour12:false});}
    else el.title=CLOUD._statusMsg||"資料同步狀態";
  }else el.title="目前只保存於這台裝置；請定期匯出備份";
  el.dataset.state=status;el.textContent=text;
}
let renderFramePending=false;
function scheduleRender(){
  if(renderFramePending)return;renderFramePending=true;
  requestAnimationFrame(()=>{renderFramePending=false;render();});
}

function render(){
  const teacherBoardMode=view.page==="teacher" && view.tview==="board";
  const teacherZoneMode=teacherBoardMode&&state.lesson&&state.lesson.active&&state.lesson.mode==="zone";
  const studentZoneMode=view.page==="student"&&state.lesson&&state.lesson.active&&state.lesson.mode==="zone";
  const teacherArenaBattleMode=view.page==="teacher"&&view.tview==="arena"&&(
    (typeof GARENA!=="undefined"&&GARENA.active)||(typeof ARENA!=="undefined"&&ARENA.active)
  );
  document.body.classList.toggle("teacher-board-mode", teacherBoardMode);
  document.body.classList.toggle("teacher-zone-mode", !!teacherZoneMode);
  document.body.classList.toggle("student-zone-mode", !!studentZoneMode);
  document.body.classList.toggle("teacher-arena-battle-mode", !!teacherArenaBattleMode);
  document.body.classList.toggle("home-menu-mode", view.page==="home");
  if((CLOUD.role==="teacher"||!CLOUD.on())&&typeof runAnnouncementSchedules==="function")runAnnouncementSchedules();
  if(view.page!=="home") app.style.removeProperty("height");
  if(!teacherBoardMode){ document.body.style.removeProperty("--board-header-height"); }
  const bh = document.getElementById("btnHome");
  bh.style.display = view.page==="home" ? "none" : "";
  bh.textContent = (CLOUD.role==="teacher" && FB.user && view.page!=="classes") ? "🏫 切換班級" : "切換身分";
  const blo = document.getElementById("btnLogout");
  if(blo){                                                   // 已登入(非離線、非首頁)顯示登出
    const loggedIn = FB.user && view.page!=="home";
    blo.style.display = loggedIn ? "" : "none";
  }
  const whoEl = document.getElementById("who");
  if(view.page==="teacher") whoEl.textContent = "身分:老師" + (FB.user?"("+FB.user.email+")":"");
  else if(view.page==="student"){ const s=stu(view.sid); whoEl.textContent = s ? "身分:"+s.name : ""; }
  else if(view.page==="parent"){ const s=stu(view.sid); whoEl.textContent = s ? "家長檢視:"+s.name : ""; }
  else whoEl.textContent = "";
  updateSyncStatus();
  const wm = document.getElementById("copyrightWatermark");
  if(wm){
    const s = view.page==="student" ? stu(view.sid) : null;
    wm.textContent = s && view.role==="student"
      ? '© 2025 誠兆(Joenew)｜學生帳號：'+s.name+'｜班級經營公會'
      : '© 2025 誠兆(Joenew)｜班級經營公會｜未經授權請勿轉載或商用';
  }
  if(view.page==="home") renderHome();
  else if(view.page==="home2") renderLegacyHome();
  else if(view.page==="teacher") renderTeacher();
  else if(view.page==="parent") renderParent();
  else renderStudent();
  requestAnimationFrame(bindZoneCountdown);
}

/* 首頁榮譽展示:榮耀之城(城堡+城主組全員)+ 英雄榜前三名 */
/* 🏰 改用高解析度像素城堡圖(CASTLE_ICON),取代原本手繪 SVG */
function castleSVG(size){
  const S = size || 120;
  return castleImg(S);
}
function homeHonorHtml(){
  const hasCastle = state.castle && state.castle.owner && state.students.some(x=>x.group===state.castle.owner);
  const cname = esc(state.className || state.lbName || "");
  let html = "";
  // 🌏 巔峰之城:世界霸主橫幅(最上方,紫金)
  const wp = state.worldPeak;
  if(wp && wp.owner && wp.owner.className){
    const ours = PEAK.isOurs();
    const days = wp.since ? Math.max(1, Math.floor((Date.now()-new Date(wp.since).getTime())/86400000)+1) : 1;
    const peakMembers = (ours
      ? state.students.filter(x=>x.group===wp.owner.group && !String(x.id).startsWith("PK_")).sort((a,b)=>(b.totalXp||0)-(a.totalXp||0))
      : ((wp.defenders&&wp.defenders.length)?wp.defenders:PEAK.npcDefenders()).map((m,i)=>Object.assign({
          id:"peak-display-"+i, roStyle:true, gender:i%2?"female":"male", baseVariant:i%2?"female"+((i%3)+1):"male"+((i%3)+1), quickHair:"original", equipped:{}, art:{}
        },m.equipment||((PEAK.npcDefenders().find(n=>n.name===m.name && n.job===m.job)||{}).equipment)||{},m)));
    const peakGuards = peakMembers.slice(0,10).map((m,i,all)=>{
      const row=i<5?"back":"front";
      const start=row==="back"?0:5, col=i-start, total=Math.min(5,all.length-start);
      const left=50+(col-(total-1)/2)*18.5;
      const set=legendSetInfo(m.legendSetId);
      return '<span class="peak-guard '+row+(set?' legend-showcase':'')+'" title="'+esc(m.name)+(set?'・'+set.name:'')+'" style="left:'+left+'%;animation-delay:-'+(i*.27).toFixed(2)+'s">'+dollSVG(m,row==="front"?54:49)+'</span>';
    }).join("");
    html += '<div style="background:linear-gradient(135deg,#2d1b4e,#4a2a7a);border:4px solid #f0b429;border-radius:18px;padding:12px 22px;width:min(100%,780px);box-shadow:6px 6px 0 rgba(20,20,20,.5);color:#fff">'
      + '<div class="peak-honor-head"><div class="peak-scene"><img src="assets/peak-castle-v1.webp" alt="巔峰之城完整城堡">'+peakGuards+'</div>'
      + '<div class="peak-copy"><div style="font-size:13px;letter-spacing:2px;color:#f0b429;font-weight:900">🌏 THE WORLD PEAK</div>'
      + '<div class="peak-title" style="color:#f0b429">巔峰之城</div>'
      + '<div style="font-size:16px;font-weight:900;margin-top:2px">'+esc(wp.owner.className)+'・'+esc(wp.owner.group)+' 組 稱霸世界中</div>'
      + '<div class="mini" style="color:#d8c9f0;margin-top:4px">已在位第 '+days+' 天'+(ours?'・👑 就是我們班!每日稅收 +30 金':'・佔領本班榮耀之城後,組長可購券挑戰')+'</div></div></div>'
      + (wp.owner.memberNames && wp.owner.memberNames.length ? '<div style="border-top:2px dashed #f0b429;margin:8px 0 4px"></div><div class="mini" style="color:#f5e8c9">🌏 巔峰霸主:'+wp.owner.memberNames.map(esc).join("・")+'</div>' : '')
      + '</div>';
  }
  if(hasCastle){
    const members = state.students.filter(x=>x.group===state.castle.owner)
      .sort((a,b)=>(b.totalXp||0)-(a.totalXp||0));
    const lid = state.groupLeaders[state.castle.owner];
    const chips = members.map(m=>
      '<div style="display:inline-flex;flex-direction:column;align-items:center;width:64px;margin:4px">'
      + dollSVG(m, 46)
      + '<span style="font-size:12px;font-weight:900;margin-top:2px">'+(m.id===lid?"👑":"")+esc(m.name)+'</span>'
      + '<span class="mini num">Lv.'+m.level+'</span></div>').join("");
    const days = state.castle.since ? Math.max(1, Math.floor((Date.now()-new Date(state.castle.since).getTime())/86400000)+1) : 1;
    html += '<div style="margin-top:20px;background:linear-gradient(135deg,#fff6d8,#ffe09a);border:4px solid #141414;border-radius:18px;padding:16px 20px;max-width:560px;box-shadow:6px 6px 0 rgba(20,20,20,.5)">'
      + '<div class="castle-honor-head">'
      + '<div class="castle-scene">'+castleSVG(174)
      + members.slice(0,10).map((m,i)=>'<span class="castle-guard '+(i<5?'upper':'lower')+'" title="'+esc(m.name)+'" style="left:'+(i<5?(15+i*18):(15+(i-5)*18))+'%">'+dollSVG(m, i<5?30:34)+'</span>').join("")+'</div>'
      + '<div class="castle-copy"><div style="font-size:13px;letter-spacing:2px;color:#b8860b;font-weight:900">👑 THE GLORY CASTLE</div>'
      + '<div class="castle-title">榮耀之城</div>'
      + '<div style="font-size:17px;font-weight:900;margin-top:2px">'+esc(state.castle.owner)+' 組 稱霸中</div>'
      + '<div class="mini">'+cname+'・公會戰冠軍・已佔領第 '+days+' 天</div></div>'
      + '</div>'
      + '<div style="border-top:2px dashed #b8860b;margin:12px 0 8px"></div>'
      + '<div class="mini" style="font-weight:900;margin-bottom:4px">🛡 城主組成員</div>'
      + '<div style="display:flex;flex-wrap:wrap;justify-content:center">'+chips+'</div>'
      + '</div>';
  }
  // 英雄榜前三名(全班總XP)
  const top = state.students.slice().sort((a,b)=>(b.totalXp||0)-(a.totalXp||0)).slice(0,3);
  if(top.length && top[0] && (top[0].totalXp||0)>0){
    const medal = ["🥇","🥈","🥉"];
    const podium = top.map((m,i)=>
      '<div style="display:inline-flex;flex-direction:column;align-items:center;width:96px;margin:6px">'
      + '<div style="font-size:24px">'+medal[i]+'</div>'
      + dollSVG(m, i===0?68:56)
      + '<span style="font-size:14px;font-weight:900;margin-top:3px">'+esc(m.name)+'</span>'
      + '<span class="mini">'+esc(JOB_INFO[m.job].name)+'・Lv.'+m.level+'</span>'
      + '<span class="mini num">'+(m.totalXp||0)+' XP</span></div>').join("");
    html += '<div style="margin-top:16px;background:#fff;border:4px solid #141414;border-radius:18px;padding:14px 20px;max-width:560px;box-shadow:6px 6px 0 rgba(20,20,20,.5)">'
      + '<div style="font-size:18px;font-weight:900;margin-bottom:6px">🏆 英雄榜 · TOP 3'+(cname?' <span class="mini" style="color:#888">'+cname+'</span>':'')+'</div>'
      + '<div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-end">'+podium+'</div>'
      + '</div>';
  }
  return html ? '<div style="display:flex;flex-direction:column;align-items:center">'+html+'</div>' : "";
}
/* 🧭 首頁新手目錄：讓學生登入前就知道學習、成長與創作的順序。 */
function homeGuideHtml(forceOpen){
  return '<details class="home-guide"'+(forceOpen?' open':'')+'>'
    + '<summary>🧭 新生註冊說明 <span class="mini">第一次登入先看</span></summary>'
    + '<div class="home-guide-body">'
    + '<div class="home-guide-index"><span>① 📱 掃班級 QR</span><span>② 🪪 建立名冊角色</span><span>③ 🧍 選角與校正</span></div>'
    + '<div class="guide-steps">'
    + '<div class="guide-step"><span class="guide-step-icon">📱</span><div><b>步驟 1・掃描老師大屏的班級 QR</b><div class="mini">QR 已含 5 碼班級代碼與本節課通行證，不需要再手動輸入班級代碼。</div><div class="guide-example"><span>班級代碼範例：7K9M2</span></div></div></div>'
    + '<div class="guide-step"><span class="guide-step-icon">🔐</span><div><b>步驟 2・選擇登入或第一次註冊</b><div class="mini">已有角色請按「Google 登入」；第一次使用請按「第一次註冊」，兩個流程不會混在一起。</div><div class="guide-example"><span>student@mail.edu.tw</span></div></div></div>'
    + '<div class="guide-step"><span class="guide-step-icon">🪪</span><div><b>步驟 3・第一次填姓名、學號與座號</b><div class="mini">系統會自動加入本班名冊並平均編組；若老師已匯入名冊，則會自動認領原資料。</div><div class="guide-example"><span>姓名：王小明</span><span>學號：1120345</span><span>座號：15</span></div></div></div>'
    + '<div class="guide-step"><span class="guide-step-icon">🧍</span><div><b>步驟 4・選角色並調整位置</b><div class="mini">選擇生理男／生理女、素體與職業，並用方向與大小按鈕讓裝備正確對齊；完成後即建立角色。</div></div></div>'
    + '</div><div class="mini" style="margin-top:9px;color:#6a5530">⚠️ 學號、座號或 Google 帳號已被使用時，系統會停止註冊並請老師核對，避免重複角色。</div>'
    + '</div></details>';
}

function homeProgressRoadHtml(){
  const at=classEffectiveStage();
  return '<div class="home-progress-road">'+CLASS_UNLOCK_STAGES.map(st=>'<div class="home-progress-step '+(at>=st.id?'open':'')+(at===st.id?' current':'')+'"><span class="ico">'+(at>=st.id?st.icon:'🔒')+'</span>'+esc(st.name)+'<div class="mini num">'+(st.per?st.per.toLocaleString()+' XP/人':'起始')+'</div></div>').join("")+'</div>';
}
function fitHomePane(){
  const vp=document.querySelector(".home-pane-viewport"),inner=document.getElementById("homePaneScale"); if(!vp||!inner)return;
  const header=document.querySelector("header"); if(header) app.style.height=Math.max(320,window.innerHeight-header.getBoundingClientRect().height)+"px";
  inner.style.transform="translateX(-50%) scale(1)";
  const sw=Math.max(1,inner.scrollWidth),sh=Math.max(1,inner.scrollHeight),scale=Math.max(.38,Math.min(1,(vp.clientWidth-4)/sw,(vp.clientHeight-4)/sh));
  inner.style.transform="translateX(-50%) scale("+scale+")";
}

function renderHome(){
  const fbOk=FB.ready, q=new URLSearchParams(location.search);
  const cid=normalizeClassCode(q.get("class")||""), sessionToken=String(q.get("session")||"");
  const dotaEntry=q.get("dota"), wantsMoba=dotaEntry==="1"||dotaEntry==="signup", wantsReward=!!q.get("reward");
  const teacherEntry=q.get("teacher")==="1", studentEntry=!!cid&&(!!sessionToken||wantsMoba||wantsReward);
  const authBrowserWarning=isEmbeddedAuthBrowser()?'<div class="mini" style="padding:9px;margin:9px 0;background:#fff0d5;border:2px solid #d38b24;border-radius:9px;color:#734600">⚠️ 目前是通訊軟體內建瀏覽器。Google 可能拒絕登入，請按右上角選單，改用 Chrome 或 Safari 開啟。</div>':'';
  let pane="";
  if(studentEntry){
    const title=wantsMoba?(dotaEntry==="signup"?"Dota 即時報名":"Dota 戰場參戰"):(wantsReward?"領取教師獎勵":"本節課學生登入");
    pane='<div class="home-login-pane"><div class="panel" style="max-width:520px;margin:0 auto;text-align:center"><h3>🎒 '+title+'</h3>'
      +'<div class="mini" style="line-height:1.8">班級代碼 <b class="num">'+esc(cid)+'</b><br>已有角色與第一次註冊分開進入，請選擇正確按鈕。</div>'
      +'<div class="mini" style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:11px 0"><span>① Google 登入</span><span>② 核對班級</span><span>③ 進入／選角</span></div>'
      +authBrowserWarning
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px"><button class="btn gold" id="studentQrGoogle"'+(fbOk?'':' disabled')+' style="font-size:17px;padding:11px 12px">🔐 Google 登入</button><button class="btn" id="studentFirstRegister"'+(fbOk?'':' disabled')+' style="font-size:17px;padding:11px 12px;background:#fff3c4;color:#141414;border:3px solid #141414">🪪 第一次註冊</button>'
      +'<div class="mini" style="grid-column:1/-1;padding:8px;background:#eef8ff;border:2px solid #8ac7e8;border-radius:9px">已有角色選左邊；尚未建立角色才選右邊，完成後會進入選角與最後確認。</div></div>'
      +(!fbOk?'<div class="mini" style="color:#c0392b;margin-top:8px">目前無法連線登入服務，請檢查網路後重新整理。</div>':'')+'</div></div>';
  }else if(teacherEntry){
    pane='<div class="home-login-pane"><div class="panel" style="max-width:520px;margin:0 auto;text-align:center"><h3>📜 教師登入</h3><div class="mini">完成 Google 登入後，系統會顯示您建立或管理的班級。</div>'
      +'<div class="mini" style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:11px 0"><span>① Google 登入</span><span>② 選擇班級</span><span>③ 按開始上課產生 QR</span></div>'
      +authBrowserWarning
      +'<button class="btn gold" id="teacherQrGoogle"'+(fbOk?'':' disabled')+' style="font-size:20px;padding:12px 24px;margin-top:14px">使用 Google 登入</button>'
      +(!fbOk?'<div class="mini" style="color:#c0392b;margin-top:8px">目前無法連線登入服務，請檢查網路後重新整理。</div>':'')+'</div></div>';
  }else{
    pane='<div class="home-login-pane"><p>'+(fbOk?'請選擇身分':'⚠️ 目前無法連線登入服務，請檢查網路後重新整理')+'</p>'
      +'<div class="role-grid"><button class="role-card teacher" id="loginTeacher"'+(fbOk?'':' disabled')+'><span class="face">📲</span><span class="nm">教師登入</span><span class="sub">顯示 QR Code・Google 帳號</span></button>'
      +'<button class="role-card" id="loginStudentWait"'+(fbOk?'':' disabled')+'><span class="face">🎒</span><span class="nm">學生登入</span><span class="sub">提前登入等待・快速回課堂</span></button>'
      +'<button class="role-card" id="loginParent"><span class="face">👪</span><span class="nm">家長查看</span><span class="sub">班級代碼＋學號＋生日</span></button></div>'
      +'<div id="parentForm" style="display:none;max-width:340px;width:100%"><div class="panel"><h3>👪 家長查看</h3>'
      +(function(){try{const p=JSON.parse(sessionStorage.getItem("rpg-parent-last")||"null");window._pLast=p&&Date.now()-(p.ts||0)<30*60*1000?p:null;return window._pLast?'<div class="mini" style="color:#3fae76">本分頁暫存班級與學號（30 分鐘）・<a href="#" id="pForget">清除</a></div>':"";}catch(_){window._pLast=null;return "";}})()
      +'<input type="text" id="pCid" autocomplete="off" maxlength="20" placeholder="班級代碼，例如 7K9M2" style="width:100%;margin-bottom:6px;text-transform:uppercase"><input type="text" id="pSno" inputmode="numeric" autocomplete="off" placeholder="孩子學號" style="width:100%;margin-bottom:6px"><input type="password" id="pBirth" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="生日 8 碼，例如 20130215" style="width:100%;margin-bottom:6px"><div class="mini" style="margin-bottom:6px">為保護學生資料，生日不會保存在瀏覽器。</div><button class="btn gold" id="pGo" style="width:100%">查看學習狀況</button></div></div>'
      +'<div class="home-footer-credit">系統設計者：誠兆老師・協作：Claude、Codex・版本：班級經營公會 v1.0<br><b>© 2025 誠兆(Joenew)．著作權所有</b>・未經書面同意不得重製、散布、公開傳輸或商業使用。</div></div>';
  }
  app.innerHTML='<div class="home home-classroom" style="position:relative"><div class="crest">🏰</div><h2>冒險者公會</h2><div class="home-pane-viewport"><div class="home-pane-scale" id="homePaneScale">'+pane+'</div></div></div>';
  requestAnimationFrame(fitHomePane);setTimeout(fitHomePane,120);
  if(!window._homeFitBound){window._homeFitBound=true;window.addEventListener("resize",()=>{if(view.page==="home")fitHomePane();});}
  if(studentEntry){
    const beginStudentAuth=mode=>{try{localStorage.setItem("rpg-last-class",cid);sessionStorage.setItem("rpg-student-mode",mode);sessionStorage.removeItem("rpg-student-join");}catch(_){}googleLogin("student");};
    document.getElementById("studentQrGoogle").onclick=()=>beginStudentAuth("login");
    document.getElementById("studentFirstRegister").onclick=()=>beginStudentAuth("auto");
    return;
  }
  if(teacherEntry){document.getElementById("teacherQrGoogle").onclick=()=>googleLogin("teacher");return;}
  document.getElementById("loginTeacher").onclick=openTeacherLoginQr;
  document.getElementById("loginStudentWait").onclick=()=>{
    try{sessionStorage.setItem("rpg-student-mode","waiting");sessionStorage.removeItem("rpg-student-join");}catch(_){}
    const lastRole=(()=>{try{return localStorage.getItem("rpg-last-role")||"";}catch(_){return "";}})();
    if(FB.user&&lastRole==="student")loginSuccess(FB.user,"student");
    else googleLogin("student");
  };
  document.getElementById("loginParent").onclick=()=>{const f=document.getElementById("parentForm"),show=f.style.display==="none";f.style.display=show?"":"none";requestAnimationFrame(fitHomePane);if(show){const el=document.getElementById("pCid");if(el&&!el.value)el.focus();}};
  document.getElementById("pGo").onclick=parentLogin;
  const rememberedCid=normalizeClassCode((window._pLast&&window._pLast.cid)||localStorage.getItem("rpg-last-class")||"");document.getElementById("pCid").value=rememberedCid;
  if(window._pLast)document.getElementById("pSno").value=window._pLast.sno||"";
  ["pCid","pSno","pBirth"].forEach(id=>{const el=document.getElementById(id);if(el)el.onkeydown=e=>{if(e.key==="Enter")parentLogin();};});
  const pf=document.getElementById("pForget");if(pf)pf.onclick=e=>{e.preventDefault();try{sessionStorage.removeItem("rpg-parent-last");}catch(_){}window._pLast=null;["pCid","pSno","pBirth"].forEach(id=>document.getElementById(id).value="");toast("已清除暫存資料");};
}
/* 離線模式:保留 v35 原首頁(單機直接選角/老師) */
function renderLegacyHome(){
  const cards = state.students.map(s=>
    '<button class="role-card" data-stu="'+s.id+'">'
    + dollSVG(s, 56)
    + '<span class="nm">'+esc(s.name)+'</span>'
    + '<span class="sub num">'+s.id+'・Lv.'+s.level+'</span></button>').join("");
  app.innerHTML =
    '<div class="home"><div class="crest">🏰</div><h2>冒險者公會(離線模式)</h2>'
    + '<p>資料存在這台裝置。此模式無登入保護,建議只在教室設備使用。</p>'
    + '<div class="role-grid">'
    + '<button class="role-card teacher" id="enterTeacher"><span class="face">📜</span><span class="nm">公會大師(老師)</span><span class="sub">觸控大屏・分組加分・名冊管理</span></button>'
    + cards + '</div>'
    + '<div style="margin-top:12px"><button class="btn" id="backLogin">← 回登入畫面</button></div></div>';
  document.getElementById("enterTeacher").onclick = ()=>{ view={page:"teacher", tview:"board", role:"offline"}; render(); };
  document.getElementById("backLogin").onclick = ()=>{ view={page:"home"}; render(); };
  app.querySelectorAll("[data-stu]").forEach(b=>{
    b.onclick = ()=>{ view={page:"student", sid:b.dataset.stu, tab:"stats", shopFilter:"all", role:"offline"}; render(); };
  });
}
/* Google 登入:role=teacher|student */

/* 掃描本節課 QR 的第一次登入：後端自動建立／認領名冊，再進入選角。 */

/* 新生註冊:以班級代碼+學號+座號精準核對，避免公開未認領姓名名單。 */

/* 新生自助註冊:填姓名+座號→(可選職業)→自動加入名冊 */

/* 職業選擇頁(認領時) */

/* 剛完成註冊且尚未開始冒險時，保留 24 小時素體修正期。
 * 可救援「雲端已建立、學生頁尚未成功開啟」的狀況，也不允許已有進度的角色任意轉職。 */

/* 完成認領：伺服器交易與本機畫面分開處理，避免雲端成功卻誤報綁定失敗。 */

/* 教師:班級選擇頁 */

/* 線上登入失敗復原：只清驗證／班級指標與同步快照，絕不刪 LS_KEY 離線備份或雲端資料。 */

/* 家長:座號+生日(YYYYMMDD)比對;有班級連結時先從雲端載入 */
async function parentLogin(){
  const cid=normalizeClassCode((document.getElementById("pCid")||{}).value||new URLSearchParams(location.search).get("class")||localStorage.getItem("rpg-last-class")||"");
  const sno = (document.getElementById("pSno").value||"").trim();
  const birth = (document.getElementById("pBirth").value||"").trim();
  if(!cid){toast("請輸入老師提供的班級代碼",true);return;}
  if(!sno || !/^\d{8}$/.test(birth)){ toast("請輸入學號與 8 碼生日(例 20130215)", true); return; }
  if(FB.ready&&cid){
    try{
      if(!FB.auth.currentUser)await FB.auth.signInAnonymously();
      const key=await CLOUD.parentViewKey(cid,sno,birth),doc=await FB.db.collection("classes").doc(cid).collection("parentViews").doc(key).get();
      if(!doc.exists)throw new Error("查無資料：學號或生日不符，或教師尚未同步家長摘要");
      const pv=doc.data()||{},student=pv.student||{};
      state=backfill(emptyClassState());state.className=pv.className||"班級 RPG";state.students=[student];state.tasks=Array.isArray(pv.tasks)?pv.tasks:[];state.submissions=Array.isArray(pv.submissions)?pv.submissions:[];state.log=Array.isArray(pv.log)?pv.log:[];state.awardLog=Array.isArray(pv.awardLog)?pv.awardLog:[];
      CLOUD.cid=cid;CLOUD.role="parent";CLOUD.myId=student.id;CLOUD.stopListen();
    }catch(e){toast(e.message||"無法讀取家長學習摘要",true);return;}
  }
  const s=state.students.find(x=>String(x.sno||"")===sno&&String(x.birth||"")===birth)||((CLOUD.role==="parent"&&state.students.length===1)?state.students[0]:null);
  if(!s){ toast("查無資料:學號或生日不符,請向老師確認", true); return; }
  try{ sessionStorage.setItem("rpg-parent-last", JSON.stringify({cid,sno,ts:Date.now()}));localStorage.setItem("rpg-last-class",cid);localStorage.removeItem("rpg-parent-last"); }catch(_){}   // 只暫存班級與學號30分鐘；生日不落地
  view={page:"parent", sid:s.id, role:"parent"}; render();
}

let parentPrivacyTimer=null;
function armParentPrivacyTimer(){
  clearTimeout(parentPrivacyTimer);parentPrivacyTimer=setTimeout(()=>{
    if(view&&view.page==="parent"){doLogout();setTimeout(()=>toast("🔒 家長查看已達 15 分鐘，為保護學生隱私已自動登出。",true),80);}
  },PARENT_VIEW_TTL_MS);
}
/* 家長唯讀頁:每日任務 + 學習日誌 */

/* 統一登出:清雲端登入、監聽、回首頁 */
function doLogout(){
  const wasStudent=CLOUD.role==="student";
  try{ if(GARENA.active) garenaStop(); }catch(e){}
  try{ CLOUD.stopListen && CLOUD.stopListen(); }catch(e){}
  if(FB.ready && FB.user){ FB.auth.signOut().catch(()=>{}); }
  FB.user = null; CLOUD.role = null;
  try{ localStorage.removeItem("rpg-last-role"); }catch(_){}    // 主動登出→下次不自動恢復
  try{sessionStorage.removeItem("rpg-student-mode");sessionStorage.removeItem("rpg-student-join");sessionStorage.removeItem("rpg-login-role");}catch(_){}
  if(wasStudent){try{const clean=new URL(location.href);clean.search="";clean.hash="";history.replaceState(null,"",clean.toString());}catch(_){}}
  view = {page:"home"}; render();
  toast("已登出");
}

/* ── 老師端 ───────────────────────────────────────── */
function groupScore(g){
  return state.students.filter(s=>s.group===g).reduce((a,s)=>a+s.totalXp, 0);
}
function randomClassSessionToken(){
  try{ if(crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g,""); }catch(_){}
  return Date.now().toString(36)+Math.random().toString(36).slice(2,12);
}

function makeClassSession(){
  const now=Date.now();
  return {active:true,startedAt:now,endedAt:0,expiresAt:now+CLASS_SESSION_MAX_MS,token:randomClassSessionToken()};
}
function classSessionIsLive(cs,expectedToken){
  cs=cs||{};
  if(!cs.active||!String(cs.token||""))return false;
  if(expectedToken&&String(expectedToken)!==String(cs.token||""))return false;
  const expires=Number(cs.expiresAt)||(Number(cs.startedAt)?Number(cs.startedAt)+CLASS_SESSION_MAX_MS:0);
  return !expires||Date.now()<expires;
}
/* 同網域地下城視窗每數秒查詢：老師一開始上課就先結算、再退出複習。 */
window.classRpgDungeonClassStatus=function(cid){
  const same=String(cid||"")===String(CLOUD.cid||"");
  return {sameClass:same,active:same&&classSessionIsLive(state.classSession),className:String(state.className||state.lbName||"本班")};
};
let _studentSessionExit=false;
function forceStudentClassExit(message){
  if(_studentSessionExit)return;_studentSessionExit=true;
  try{CLOUD.stopListen&&CLOUD.stopListen();}catch(_){}
  try{sessionStorage.removeItem("rpg-student-mode");sessionStorage.removeItem("rpg-student-join");}catch(_){}
  try{localStorage.removeItem("rpg-last-role");}catch(_){}
  try{const clean=new URL(location.href);clean.search="";clean.hash="";history.replaceState(null,"",clean.toString());}catch(_){}
  const signedOut=FB.ready&&FB.auth?FB.auth.signOut().catch(()=>{}):Promise.resolve();
  FB.user=null;CLOUD.role=null;
  signedOut.finally(()=>{
    app.innerHTML='<div class="home"><div class="crest">🏁</div><h2>本節課已結束</h2><div class="panel" style="max-width:500px;margin:0 auto;text-align:center"><p>'+esc(message||"老師已結束本節課，你已安全登出。")+'</p><div class="mini">下次上課請重新掃描老師大屏顯示的新 QR Code。</div></div><button class="btn gold" id="classEndedHome" style="margin-top:12px">回到首頁</button></div>';
    const b=document.getElementById("classEndedHome");if(b)b.onclick=()=>{_studentSessionExit=false;view={page:"home"};render();};
  });
}
async function revalidateStudentClassSession(){
  if(CLOUD.role!=="student"||!CLOUD.on())return;
  const token=String(new URLSearchParams(location.search).get("session")||"");if(!token)return;
  try{
    const doc=await FB.db.collection("classes").doc(CLOUD.cid).collection("public").doc("main").get();
    if(!doc.exists||!classSessionIsLive((doc.data()||{}).classSession,token))forceStudentClassExit("本節課已結束或登入通行證已更新，這台裝置已安全登出。");
  }catch(e){console.warn("class session recheck",e);}
}
function teacherClassHome(){
  const cs=state.classSession||{}, live=classSessionIsLive(cs);
  const className=state.className||state.lbName||"本班";
  const started=cs.startedAt?new Date(cs.startedAt).toLocaleString("zh-TW",{hour12:false}):"尚未開始";
  const count=state.students.filter(s=>s&&!s.archived).length;
  return '<div class="classroom-home-hero"><div class="classroom-home-head"><div class="classroom-home-icon">🏫</div>'
    +'<div class="classroom-home-title"><h2>'+esc(className)+'・課堂首頁</h2><div class="mini">班級代碼 <b class="num">'+esc(CLOUD.cid||"本機班級")+'</b>・'+count+' 名學生・'+state.groups.length+' 組</div></div>'
    +'<div class="class-session-badge '+(live?'live':'')+'"><span class="class-session-dot"></span>'+(live?'上課中・'+esc(started):'尚未開始上課')+'</div></div>'
    +'<div class="classroom-flow"><div class="classroom-flow-step '+(live?'ready':'')+'"><b><span class="step-no">1</span>開始上課</b><div class="mini">建立本節課專用通行證；下課後 QR 自動失效。</div></div>'
    +'<div class="classroom-flow-step '+(live?'ready':'')+'"><b><span class="step-no">2</span>學生掃碼</b><div class="mini">學生掃班級 QR，再用已綁定的 Google 帳號登入。</div></div>'
    +'<div class="classroom-flow-step '+(live?'ready':'')+'"><b><span class="step-no">3</span>連接大屏</b><div class="mini">投影所有組員，快速點名、加分與進行課堂活動。</div></div></div>'
    +'<div class="classroom-home-actions">'+(live?'<button class="btn danger" id="classEndBtn">⏹ 結束課程</button>':'<button class="btn gold" id="classStartBtn">▶ 開始上課</button>')
    +'<button class="btn gold" id="classShowQr"'+(!live?' disabled':'')+'>📱 顯示學生登入 QR</button>'
    +'<button class="btn" id="classGoBoard"'+(!live?' disabled':'')+'>🖥️ 進入大屏模式</button>'
    +'<button class="btn" id="classOpenRoster">📋 查看／管理名冊</button></div>'
    +(CLOUD.on()?'':'<div class="unlock-note" style="margin-top:14px">本機班級不提供跨裝置 QR 登入；請由首頁使用教師 Google 登入並選擇雲端班級。</div>')+'</div>'
    +classProgressHtml(true);
}
function teacherClassProgress(){
  const cfg=state.classUnlocks, xp=classEarnedXp(), auto=classAutoStage(), effective=classEffectiveStage();
  const cards=CLASS_UNLOCK_STAGES.map(st=>{
    const target=classStageTarget(st), open=effective>=st.id, isCurrent=effective===st.id;
    return '<div class="class-stage-card '+(open?'open':'locked')+(isCurrent?' current':'')+'"><span class="stage-icon">'+st.icon+'</span><span class="stage-state">'+(open?'✅':'🔒')+'</span>'
      +'<div><b>第 '+st.id+' 階段・'+esc(st.name)+'</b></div><div class="mini">'+esc(st.desc)+'</div>'
      +'<div class="mini num" style="margin-top:5px">每人 '+st.per.toLocaleString()+' XP・全班門檻 '+target.toLocaleString()+'</div>'
      +(st.id>auto&&cfg.enabled!==false?'<button class="btn '+(cfg.manualStage===st.id?'gold':'')+'" data-classstage="'+st.id+'" style="margin-top:7px;padding:3px 8px;font-size:11px">'+(cfg.manualStage===st.id?'已指定此階段':'提前開放至此')+'</button>':'')+'</div>';
  }).join("");
  const gateCards=Object.entries(CLASS_GATE_INFO).map(([key,info])=>{
    const related=Object.keys(CLASS_FEATURE_GATES).filter(f=>CLASS_FEATURE_GATES[f]===key),need=Math.min(...related.map(classFeatureStage)),ready=effective>=need,on=!!cfg.teacherGates[key];
    return '<div class="class-stage-card '+(on?'open':'locked')+'"><span class="stage-icon">'+info.icon+'</span><span class="stage-state">'+(on?'✅':'🔒')+'</span><div><b>'+esc(info.name)+'</b></div><div class="mini">'+esc(info.note)+'</div><button class="btn '+(on?'danger':'gold')+'" data-classgate="'+key+'"'+(ready?'':' disabled')+' style="margin-top:7px">'+(on?'暫停此功能':'教師確認開放')+'</button>'+(ready?'':'<div class="mini" style="margin-top:5px">需先達第 '+need+' 階段</div>')+'</div>';
  }).join("");
  return classProgressHtml(false)
    +'<div class="panel"><h3>⚙️ 全班功能解鎖設定</h3><div class="inline-form">'
    +'<button class="btn '+(cfg.enabled?'gold':'danger')+'" id="classUnlockToggle">'+(cfg.enabled?'✅ 依班級 XP 解鎖':'🔓 全部功能開放中')+'</button>'
    +'<button class="btn" id="classUnlockAuto">↺ 恢復自動進度</button>'
    +'<button class="btn gold" id="classUnlockPreview">🎆 預覽解鎖慶典</button>'
    +'<label class="stat-chip">門檻倍率 <select id="classUnlockScale"><option value="0.5">0.5× 快速</option><option value="0.75">0.75×</option><option value="1">1× 標準</option><option value="1.25">1.25×</option><option value="1.5">1.5× 挑戰</option><option value="2">2× 長期</option></select></label></div>'
    +'<div class="mini" style="margin-top:8px;line-height:1.8">目前計算 <b>'+classProgressStudents().length+' 名有效學生</b>，全班累積 <b class="num">'+xp.toLocaleString()+' XP</b>。提前開放不會發放個人 XP，也不會降低學生等級。涉及同儕權力、公開比較與對戰的功能，即使 XP 達標仍須教師個別確認。</div></div>'
    +'<div class="panel"><h3>🛡️ 友善課堂安全閘門</h3><div class="mini" style="margin-bottom:9px">每一類可獨立暫停，不會連帶關閉學生的公告、任務與自主學習。學生提出求助不會降低全班進度。</div><div class="class-progress-stages">'+gateCards+'</div></div>'
    +'<div class="panel"><h3>🗺️ 解鎖路線</h3><div class="class-progress-stages">'+cards+'</div></div>';
}
/* ══ 📈 教師配分指南(三學年 EXP 系統說明)══ */
function teacherGuide(){
  const ec=economyCfg(),econStudents=state.students.filter(s=>state.dataProfile!=="production"||!/^T\d+$/i.test(String(s.id||"")));
  const classGold=econStudents.reduce((n,s)=>n+(Number(s.gold)||0),0),classDiamonds=econStudents.reduce((n,s)=>n+(Number(s.diamonds)||0),0);
  const diamondFlowRows=econStudents.map(s=>({s,flow:studentDiamondFlow(s)})).filter(x=>x.flow.total>0).sort((a,b)=>String(a.s.name||"").localeCompare(String(b.s.name||""),"zh-Hant"));
  const diamondFlowTable=diamondFlowRows.length
    ? '<div class="panel"><h3>💎 本週鑽石來源紀錄（僅教師）</h3><div class="mini">分開記錄教師獎勵、學習連續與受監督互評；感謝卡不列入鑽石。</div><table><thead><tr><th>學生</th><th>教師獎勵</th><th>學習連續</th><th>有效互評</th><th>本週合計</th></tr></thead><tbody>'+diamondFlowRows.map(x=>'<tr><td>'+esc(x.s.name)+'</td><td class="num">'+x.flow.reward+' / '+ec.rewardDiamondWeeklyCap+'</td><td class="num">'+x.flow.learning+' / '+ec.learningDiamondWeeklyCap+'</td><td class="num">'+x.flow.review+' / '+ec.peerReviewWeeklyDiamondCap+'</td><td class="num"><b>'+x.flow.total+' / '+ec.totalDiamondWeeklyCap+'</b></td></tr>').join('')+'</tbody></table></div>'
    : '<div class="panel"><h3>💎 本週鑽石來源紀錄（僅教師）</h3><div class="mini">本週尚未發放鑽石；之後會依教師獎勵、學習連續、有效互評分欄記錄。</div></div>';
  const RUBRIC = [
    {k:"課前準備", note:"帶齊課本/講義/計算紙、準時就座", g7:20, g8:50,  g9:75},
    {k:"課堂參與", note:"舉手發表、上台解題、小組討論貢獻", g7:40, g8:120, g9:200},
    {k:"作業完成", note:"當日作業繳交 + <b>訂正完成度</b>", g7:60, g8:180, g9:300},
    {k:"隨堂表現", note:"小考成績、隨堂練習、學習單品質", g7:40, g8:140, g9:250}
  ];
  const QUESTS = [
    {n:"📕 段考副本", d:"達班平均+1階<b>或進步5分以上</b>", c:6,  g7:800, g8:2500, g9:4000},
    {n:"✏️ 錯題訂正大師", d:"錯題本≥5題含算式與觀念說明", c:20, g7:100, g8:300,  g9:500},
    {n:"🧑‍🏫 數學小老師", d:"指導同學一單元並回報成效", c:15, g7:100, g8:300,  g9:500},
    {n:"⏱ 限時挑戰", d:"當堂10分鐘限時題組達標", c:12, g7:150, g8:450,  g9:750},
    {n:"🏆 單元成就", d:"小考連續3次達標/全對/進步最大", c:8,  g7:200, g8:550,  g9:900},
    {n:"🔍 生活數學專題", d:"生活數學情境一頁圖文報告", c:2,  g7:600, g8:1800, g9:2600},
    {n:"📐 競賽與檢定", d:"競賽或檢定報名並完賽(不論名次)", c:2, g7:500, g8:1500, g9:2200},
    {n:"🌱 補救全勤", d:"補救教學/課後輔導全勤(月結)", c:10, g7:150, g8:400,  g9:700}
  ];
  const tot = (key)=> QUESTS.reduce((a,q)=>a+q.c*q[key], 0);
  const sum = (key)=> RUBRIC.reduce((a,r)=>a+r[key], 0);

  // 全班等級分布
  const dist = {七年級:0, 八年級:0, 九年級:0, 畢業衝刺:0};
  state.students.forEach(s=>{ const g=gradeStageOf(s.level); dist[g.grade]=(dist[g.grade]||0)+1; });

  // 全班每日 EXP 使用狀況
  const capRows = state.students.slice(0,999).map(s=>{
    const used = dailyUsed(s), cap = dailyCapOf(s);
    const pct = cap ? Math.round(used/cap*100) : 0;
    return {n:s.name, lv:s.level, used, cap, pct, g:gradeStageOf(s.level).grade};
  }).sort((a,b)=>b.pct-a.pct);

  return '<div class="panel"><h3>💰 班級經濟控制台</h3>'
    +'<div class="teacher-task-summary"><div><b>1 💎＝1,000 金</b><span class="mini">固定價值尺度</span></div><div><b>'+classGold.toLocaleString()+' 金</b><span class="mini">學生流通總額</span></div><div><b>'+classDiamonds.toLocaleString()+' 💎</b><span class="mini">鑽石存量</span></div><div><b>'+Math.max(0,(Number(ec.goldIssued)||0)-(Number(ec.goldSpent)||0)).toLocaleString()+'</b><span class="mini">系統淨發行</span></div></div>'
    +'<div class="inline-form" style="margin-top:10px;align-items:end;flex-wrap:wrap">'
    +'<label>每人每日金幣發行上限<input id="econDailyCap" type="number" min="0" max="5000" value="'+ec.dailyGoldCap+'"></label>'
    +'<label>地下城每日上限<input id="econDungeonCap" type="number" min="0" max="500" value="'+ec.dungeonDailyGoldCap+'"></label>'
    +'<label>每件互評獎勵<input id="econPeerGold" type="number" min="0" max="500" value="'+ec.peerReviewGold+'"></label>'
    +'<label>每幾件互評得 1💎<input id="econPeerEvery" type="number" min="5" max="100" value="'+ec.peerReviewDiamondEvery+'"></label>'
    +'<label>代審每週鑽石上限<input id="econPeerWeek" type="number" min="0" max="2" value="'+ec.peerReviewWeeklyDiamondCap+'"></label>'
    +'<label>教師獎勵卡每週上限<input id="econRewardGemWeek" type="number" min="0" max="5" value="'+ec.rewardDiamondWeeklyCap+'"></label>'
    +'<label>學習連勝每週上限<input id="econLearnGemWeek" type="number" min="0" max="3" value="'+ec.learningDiamondWeeklyCap+'"></label>'
    +'<label>每人每週總上限<input id="econTotalGemWeek" type="number" min="1" max="10" value="'+ec.totalDiamondWeeklyCap+'"></label>'
    +'<button class="btn gold" id="econSave">儲存經濟設定</button></div>'
    +'<div class="mini" style="margin-top:8px;line-height:1.8">建議每人每週最多 <b>6💎</b>：教師核發 3、學習連勝 2、受監督代審 1。感謝卡只累積班級關懷值，不發個人鑽石，避免形成同儕人氣交易。鑽石不開放自由兌換；超過來源或總上限的自動獎勵會截斷。</div></div>'+diamondFlowTable
    +'<div class="panel"><h3>⚙️ 系統開關與快速套用</h3>'
    + '<div class="inline-form" style="flex-wrap:wrap;gap:8px">'
    + '<button class="btn '+(state.dailyCapOn?"gold":"")+'" id="gdCapToggle">'
    + (state.dailyCapOn?"✅ 每日上限:啟用中":"⛔ 每日上限:已關閉")+'</button>'
    + '<button class="btn" id="gdApplyRubric">📋 套用配分範本到快捷鈕</button>'
    + '<button class="btn" id="gdDeployQuests">🎯 一鍵部署任務庫</button>'
    + '</div>'
    + '<div class="mini" style="margin-top:6px;line-height:1.8">'
    + '<b>每日上限</b>:啟用後,常規加分超過該學年上限會自動截斷(額外任務不受限)。<br>'
    + '<b>套用配分範本</b>:把四個評分向度依學生學年寫入「快捷加分鈕」,點名冊即可發放。<br>'
    + '<b>一鍵部署任務庫</b>:把 8 個任務依全班平均學年建立為正式任務,學生可回報。</div></div>'

    + (capRows.length ? ('<div class="panel"><h3>📊 今日常規 EXP 使用狀況</h3>'
        + '<table><thead><tr><th>學生</th><th>階段</th><th>今日已發</th><th>上限</th><th>使用率</th></tr></thead><tbody>'
        + capRows.map(r=>'<tr><td>'+esc(r.n)+' <span class="mini">Lv.'+r.lv+'</span></td>'
            + '<td class="mini">'+r.g+'</td><td class="num">'+r.used+'</td><td class="num">'+r.cap+'</td>'
            + '<td class="num" style="color:'+(r.pct>=100?"#c0392b":(r.pct>=80?"#e08a1f":"inherit"))+'"><b>'+r.pct+'%</b></td></tr>').join("")
        + '</tbody></table></div>') : "")

    + '<div class="panel"><h3>📈 三學年等級系統</h3>'
    + '<div class="mini" style="line-height:1.9">升級公式:<b>N 級升 N+1 級需 N×100 EXP</b>(公差100等差數列),滿級 <b>'+LEVEL_CAP+'</b> 級。<br>'
    + '這套設計讓後期升級變慢,但每日上限與任務額度同步放大,三年的升級<b>節奏感是穩定的</b>。</div>'
    + '<table style="margin-top:10px"><thead><tr><th>階段</th><th>目標等級</th><th>累計 EXP</th><th>每日上限</th><th>年度任務額度</th><th>目前人數</th></tr></thead><tbody>'
    + GRADE_MILESTONES.map(m=>
        '<tr><td><b>'+m.grade+'</b></td><td class="num">Lv.'+m.level+'</td>'
        + '<td class="num">'+m.cumXp.toLocaleString()+'</td>'
        + '<td class="num">'+m.dailyCap+'</td>'
        + '<td class="num">'+(m.questYear?m.questYear.toLocaleString():"—")+'</td>'
        + '<td class="num">'+(dist[m.grade]||0)+' 人</td></tr>').join("")
    + '</tbody></table></div>'

    + '<div class="panel"><h3>🗓 每日常規配分範本</h3>'
    + '<div class="mini" style="margin-bottom:8px">每日上限是<b>硬天花板</b>——表現再好,單日常規 EXP 也不超過上限,避免通膨。</div>'
    + '<table><thead><tr><th>評分向度</th><th>評分重點</th><th>七年級</th><th>八年級</th><th>九年級</th><th>佔比</th></tr></thead><tbody>'
    + RUBRIC.map(r=>
        '<tr><td><b>'+r.k+'</b></td><td class="mini">'+r.note+'</td>'
        + '<td class="num">'+r.g7+'</td><td class="num">'+r.g8+'</td><td class="num">'+r.g9+'</td>'
        + '<td class="num">'+Math.round(r.g7/sum("g7")*1000)/10+'%</td></tr>').join("")
    + '<tr style="background:rgba(240,180,41,.15)"><td><b>每日合計</b></td><td class="mini">= 該學年每日上限</td>'
    + '<td class="num"><b>'+sum("g7")+'</b></td><td class="num"><b>'+sum("g8")+'</b></td><td class="num"><b>'+sum("g9")+'</b></td><td>100%</td></tr>'
    + '</tbody></table>'
    + '<div class="mini" style="margin-top:8px;line-height:1.9">'
    + '<b>為什麼作業佔最大宗(37.5%)?</b> 這是最能被學生自主掌控的項目,也最能拉起後段學生。重點放在<b>訂正完成度</b>而非答對率,避免抄襲、鼓勵面對錯誤。<br>'
    + '<b>操作建議:</b>①缺席日不發常規 EXP,但可用額外任務補回 ②建議週五一次登記五天份,減少行政負擔 ③全班同時達標的獎勵走「額外任務」,不要突破每日上限。</div></div>'

    + '<div class="panel"><h3>🎯 額外任務庫(不計入每日上限)</h3>'
    + '<div class="mini" style="margin-bottom:8px">數值隨學年放大約 3 倍與 5 倍——<b>同一份努力在高年級價值更高</b>,呼應等級曲線變陡。</div>'
    + '<table><thead><tr><th>任務</th><th>判定標準</th><th>年次數</th><th>七</th><th>八</th><th>九</th></tr></thead><tbody>'
    + QUESTS.map(q=>
        '<tr><td><b>'+q.n+'</b></td><td class="mini">'+q.d+'</td>'
        + '<td class="num">'+q.c+'</td>'
        + '<td class="num">'+q.g7+'</td><td class="num">'+q.g8+'</td><td class="num">'+q.g9+'</td></tr>').join("")
    + '<tr style="background:rgba(240,180,41,.15)"><td colspan="3"><b>年度可得總額</b></td>'
    + '<td class="num"><b>'+tot("g7").toLocaleString()+'</b></td>'
    + '<td class="num"><b>'+tot("g8").toLocaleString()+'</b></td>'
    + '<td class="num"><b>'+tot("g9").toLocaleString()+'</b></td></tr>'
    + '<tr><td colspan="3" class="mini">達標所需額度</td>'
    + GRADE_MILESTONES.slice(0,3).map(m=>'<td class="num mini">'+m.questYear.toLocaleString()+'</td>').join("")
    + '</tr></tbody></table>'
    + '<div class="mini" style="margin-top:8px;line-height:1.9">'
    + '<b>刻意留有餘裕:</b>任務庫提供的比達標所需多約 15~20%,學生<b>不必全部完成</b>也能升級,保留選擇權。<br>'
    + '<b>雙軌照顧兩端:</b>「錯題訂正」「小老師」「補救全勤」給願意努力但成績落後的學生;「限時挑戰」「單元成就」「競賽」給高成就學生舞台。<br>'
    + '<b>防刷分:</b>多數任務有次數上限;段考副本綁定<b>成績進步</b>,難以造假。</div></div>';
}

/* 備份提醒橫幅:週五 或 距上次備份≥7天 才出現 */
function backupBanner(){
  if(!state.backupReminder) return "";
  const lastBk = (()=>{ try{ return localStorage.getItem("rpg-last-backup"); }catch(_){ return null; } })();
  const days = lastBk ? Math.floor((Date.now()-new Date(lastBk).getTime())/86400000) : 999;
  const isFri = new Date().getDay()===5;
  // 今天已備份就不提醒
  const backedToday = lastBk && new Date(lastBk).toDateString()===new Date().toDateString();
  if(backedToday) return "";
  const snooze = (()=>{ try{ return localStorage.getItem("rpg-backup-snooze"); }catch(_){ return null; } })();
  if(snooze===new Date().toDateString()) return "";          // 今天已按「稍後」
  if(!(isFri || days>=7)) return "";
  const reason = (days>=999) ? "還沒有備份過" : (isFri ? "今天週五,是每週備份的好時機" : "距上次備份已 "+days+" 天");
  return '<div class="panel" style="background:linear-gradient(135deg,#fff6d8,#ffe4a0);border:3px solid #141414;margin-bottom:12px">'
    + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
    + '<span style="font-size:26px">💾</span>'
    + '<div style="flex:1;min-width:180px"><b>該備份資料囉!</b><div class="mini">'+reason+'。點右邊按鈕下載備份,並開啟郵件寄給自己保存。</div></div>'
    + '<button class="btn gold" id="bkNow">⬇ 下載並寄信</button>'
    + '<button class="btn" id="bkLater">稍後</button>'
    + '</div></div>';
}
function bindBackupBanner(){
  const bn = document.getElementById("bkNow");
  if(bn) bn.onclick = ()=> exportData(true);                 // true=同時開郵件草稿
  const bl = document.getElementById("bkLater");
  if(bl) bl.onclick = ()=>{                                  // 稍後:記今天已略過,當天不再跳
    try{ localStorage.setItem("rpg-backup-snooze", new Date().toDateString()); }catch(_){}
    render();
  };
}
/* ══ 競技場:1v1 表演賽(不扣真實HP) ══════════════
 * 行動條依敏捷充能,滿了自動行動;技能用學生實際點的技能表。 */
const ARENA = {
  active:false, over:false, acting:false, friendly:false,
  a:null, b:null, hpA:0, hpB:0, maxA:0, maxB:0, gA:0, gB:0,
  timer:null, speed:1, turns:0
};
/* 1v1 行動條：敏捷採遞減效益，避免高等遊俠用線性 AGI 連續霸佔回合。
   遊俠仍保有速度優勢，但最高約 1.9 秒充滿一次（另加攻擊動畫時間）。 */

/* 行動:roll 學生實際技能 → 傷害/治療 → 動畫序列 */

/* ══ 團體競技場(紅vs藍,學生手機遙控,教師端為權威主機) ══════════
 * 移動:格子制;攻擊:武器射程內最近敵人;傷害沿用競技場公式(軟化/職業係數/特性/技能roll)
 * 大招:Lv5+每場一次;勝負:全滅或180秒比(存活數→剩餘HP%) */
/* ══ 🗺 團體戰戰場 ══════════════════════════════════
   每張地圖:障礙物(不可站)、地形格(踩到有效果)、全場事件(每N拍觸發)
   座標以 14×8 為基準,實際場地較小時會自動過濾掉超出範圍的格子。 */
const BATTLE_MAPS = {
  plain: { key:"plain", name:"平原", icon:"🌾", desc:"沒有特殊地形,純粹的實力對決。",
    bg:"radial-gradient(circle at 18% 22%,rgba(255,255,220,.7) 0 2px,transparent 3px 18px),linear-gradient(135deg,rgba(255,255,255,.18) 25%,transparent 25%) 0 0/26px 26px,linear-gradient(#cfe3a8,#b6d489)", obstacles:[], zones:[], event:null },

  ice: { key:"ice", name:"冰原", icon:"🧊", desc:"移動會滑一格;裂縫踩到摔傷+暈眩;雪堆減速。每8拍寒風。",
    bg:"radial-gradient(circle at 20% 15%,rgba(255,255,255,.85) 0 2px,transparent 3px 20px),repeating-linear-gradient(135deg,rgba(255,255,255,.28) 0 8px,transparent 8px 22px),linear-gradient(#dff1fb,#9fd5ed)",
    obstacles:[[4,2],[9,2],[4,5],[9,5]],                        // 冰柱
    zones:[
      {cells:[[6,1],[7,6],[2,4],[11,3]], kind:"crack", icon:"🕸", dmg:8, label:"冰裂縫"},
      {cells:[[5,3],[8,4],[3,1],[10,6]], kind:"snow", icon:"❄", label:"深雪"}
    ],
    slide:true,
    event:{ every:8, kind:"blizzard", text:"❄️ 寒風呼嘯!" } },

  volcano: { key:"volcano", name:"火山", icon:"🌋", desc:"熔岩每拍灼燒;餘燼灼熱;蒸氣遮蔽視線。每10拍噴發落石。",
    bg:"radial-gradient(circle at 15% 20%,rgba(255,210,120,.42) 0 3px,transparent 4px 22px),repeating-linear-gradient(135deg,rgba(100,32,20,.12) 0 7px,transparent 7px 24px),linear-gradient(#653238,#d76b40 52%,#47242d)",
    obstacles:[[3,1],[10,6],[6,0],[7,7]],                       // 岩塊
    zones:[
      {cells:[[6,3],[7,3],[6,4],[7,4]], kind:"lava", dmg:6, icon:"🔥", label:"熔岩"},
      {cells:[[5,2],[8,2],[5,5],[8,5]], kind:"ember", dmg:2, icon:"🟠", label:"餘燼"},
      {cells:[[2,3],[11,4]], kind:"steam", icon:"💨", label:"蒸氣"}
    ],
    event:{ every:10, kind:"eruption", text:"🌋 火山噴發!" } },

  wind: { key:"wind", name:"風谷", icon:"🌪", desc:"兩側強風吹向中央;龍捲風隨機拋飛;上升氣流加速。遠程射程-1。",
    bg:"radial-gradient(ellipse at 25% 35%,rgba(255,255,255,.6) 0 5px,transparent 6px 30px),repeating-linear-gradient(15deg,rgba(255,255,255,.22) 0 3px,transparent 3px 16px),linear-gradient(#ccece4,#8fc9b5)",
    obstacles:[[7,1],[6,6],[3,3],[10,4]],                       // 風柱
    zones:[
      {cells:"leftEdge", kind:"windR", icon:"💨", label:"強風→"},
      {cells:"rightEdge", kind:"windL", icon:"💨", label:"←強風"},
      {cells:[[6,2],[7,5]], kind:"tornado", icon:"🌀", label:"龍捲風"},
      {cells:[[4,4],[9,3]], kind:"updraft", icon:"⬆", label:"上升氣流"}
    ],
    rangedPenalty:1,
    event:{ every:12, kind:"gale", text:"🌬 狂風大作!" } },

  desert: { key:"desert", name:"旱地", icon:"🏜", desc:"流沙陷住腳步;碎石扎腳;綠洲可回血。殘血會脫水。",
    bg:"radial-gradient(circle at 25% 30%,rgba(255,248,190,.55) 0 2px,transparent 3px 20px),repeating-linear-gradient(160deg,rgba(142,92,40,.1) 0 4px,transparent 4px 18px),linear-gradient(#f7dfa8,#d7ae67)",
    obstacles:[[5,1],[8,4],[3,6],[11,2]],                       // 仙人掌
    zones:[
      {cells:[[4,3],[9,2],[6,5],[11,4]], kind:"quicksand", icon:"🕳", label:"流沙"},
      {cells:[[2,2],[7,3],[10,5],[5,6]], kind:"gravel", dmg:2, icon:"⚱", label:"碎石"},
      {cells:[[6,1],[8,6]], kind:"oasis", heal:6, icon:"🌴", label:"綠洲"}
    ],
    heat:true,
    event:{ every:14, kind:"sandstorm", text:"🌫 沙塵暴來襲!" } },

  /* 🏰 動態 MOBA：3v3～15v15。開戰時依人數重建雙路、河道與中央山壁。 */
  moba: { key:"moba", name:"榮耀峽谷", icon:"🏰", mode:"moba",
    desc:"上下兩條榮耀之路由中央山壁隔開；可穿越中央水路轉線，但進入河道會降低行動速度。拆除兩座外塔後攻破敵方核心。",
    W:18, H:10,
    bg:"linear-gradient(180deg,transparent 0 12%,rgba(244,218,139,.34) 12% 31%,transparent 31% 68%,rgba(244,218,139,.34) 68% 87%,transparent 87%),radial-gradient(circle at 50% 50%,rgba(90,190,210,.55) 0 8%,transparent 9%),linear-gradient(90deg,rgba(194,92,82,.30),transparent 24% 76%,rgba(74,111,205,.30)),repeating-linear-gradient(45deg,rgba(255,255,255,.07) 0 9px,transparent 9px 20px),linear-gradient(#8fc874,#6fa55f)",
    obstacles:[[6,1],[11,1],[6,8],[11,8],
      [3,4],[4,4],[5,4],[6,4],[7,4],[10,4],[11,4],[12,4],[13,4],[14,4],
      [3,5],[4,5],[5,5],[6,5],[7,5],[10,5],[11,5],[12,5],[13,5],[14,5]],
    zones:[
      {cells:[[8,0],[9,0],[8,1],[9,1],[8,2],[9,2],[8,3],[9,3],[8,4],[9,4],[8,5],[9,5],[8,6],[9,6],[8,7],[9,7],[8,8],[9,8],[8,9],[9,9]],kind:"river",icon:"≈",label:"緩流河道（行動減速）"},
      {cells:[[4,1],[5,1],[12,1],[13,1],[4,8],[5,8],[12,8],[13,8]],kind:"brush",icon:"♧",label:"月桂草叢"},
      {cells:Array.from({length:18},(_,x)=>[[x,1],[x,2],[x,7],[x,8]]).flat(),kind:"lane",icon:"",label:"榮耀之路"}
    ], event:null }
};
/* 取得目前地圖(未選擇時為平原) */

/* 該格是否為障礙物(不可站立/阻擋移動) */

/* 取得該格的地形類型(zones);回傳 zone 物件或 null */

const GARENA = {
  active:false, over:false, W:14, H:8,
  fighters:{},          // sid → {sid,x,y,team,hp,max,ko,ultUsed,cd}
  cmdQueue:{},          // sid → 最新指令 {ts, move|act}
  timer:null, endTimer:null, startTs:0, DURATION:180, elapsed:0, speed:1, paused:false, pausedAt:0,
  _cmdUnsub:null, _lastTs:{}, heldMoves:{}, heldMoveUntil:{},
  mapKey:"plain", mode:"battle", structures:[], eventTick:0            // 🗺 戰場地圖 / 事件計時
};

/* Dota 目標尋路：以 BFS 繞過中央山壁、河道建築與人群，回傳下一格方向。 */

/* AI 出生後先選擇距離最近的上／下路出口，避免從中央門口直撞山壁。 */

/* ⏩ 團體戰加速：每一拍仍代表 0.5 秒遊戲時間，只縮短真實等待時間，冷卻、場地事件與倒數保持同步。 */

/* 只有內建的掉落限定傳說武器能改變攻擊格型；一般武器與學生作品不讀取這個欄位。 */

/* 🏹 距離傷害係數:弓箭手貼臉弱(拉不開弓)、法師/牧師貼臉略強(能量彈近距更痛);其餘不受影響 */

   // 曼哈頓距離

/* 遠程彈道採兩條直角路徑判定；兩條都被岩牆／建築封住才視為無法命中。 */

/* 敏捷→行動速度：10 AGI 為 3 拍，200 AGI 為 1.5 拍，完整使用 0～200 成長區間。 */

/* ⏳ 隱藏式行動條：不畫出 UI，但每拍依敏捷累積行動值；滿 100 才能移動、攻擊或施放戰技。
   高敏捷角色會更常取得行動權，冰緩與束縛則直接拖慢行動條。 */

/* ══ 地面陷阱與二轉召喚物 ══ */

/* 三轉領域：以地面符文呈現，持續幾拍且低頻結算，保留華麗感而不增加大量投射物。 */

/* 🛡️ 盾衛侍從：位在前線 2 格內時，將隊友受到的部分傷害轉成自己的盾值。
   不另建一個可攻擊單位，避免多人戰場增加尋路與 DOM 負擔。 */

/* 📼 回放播放器:時間軸重演(位置點+血條+同步戰報) */

/* 🤖 AI演練:每拍為每個存活角色決策(移動接近→射程內攻擊;技能與大招擇時施放) */

/* 🔥 戰場狂熱:防止殘局雙牧師互奶無限拖台錢——時間越久治療越弱、傷害越高 */

/* 職業戰術技:法師AOE/牧師群補/遊俠隱身/戰士嘲諷 */

/* 戰場操作面板只提供已裝備的職業戰技；卸下對應技能後按鈕也會消失。 */

/* 💗 復活判定:倒下者的隊上有存活隊友持「復活」技能→機率拉回(每人每場一次) */

/* 🏹 投射物:從攻擊者飛向目標(箭矢/魔法彈/聖光),純視覺不影響結算 */

/* ⚔️ 近戰揮擊動作 */

/* 💢 受擊反饋:閃白抖動(delay 用於配合遠程彈道到達) */

/* 💥 範圍濺射:對主目標周圍 1 格內敵人造成比例傷害(隕石爆炸/暴風雪),可附冰緩 */

/* 單一技能的追加命中：供二轉連擊、穿透與追擊共用，保留擊倒與特效流程。 */

/* 掉落傳說武器的格型攻擊。追加傷害沿用主目標結算後的傷害比例，不再二次爆擊。 */

/* 傳說工坊武器的跨職業武技：每次攻擊固定 8% 判定，與角色本身技能冷卻分開。 */

/* ⚡ 連鎖閃電：從主目標向附近不同敵人依序跳躍，不是一次性的範圍爆炸。 */

/* 計算合作貢獻；只在結算呈現輸出、治療、守護三種正向角色。 */

/* live 狀態寫雲端(學生遙控端讀)：一般 1.2 秒、12 人以上 1.8 秒；
 * 遙控指令仍獨立上傳，所以降低畫面快照頻率不會拖慢按鍵反應。 */

/* ── Dota 即時報名：報名不限，正式戰場依人數形成 3v3～15v15。 ── */
const MOBA_SIGNUP={active:false,room:"",entries:{},assign:{},cmdUnsub:null,stateUnsub:null,manual:false,thresholdShown:false};

/* 🧪 教師本機測試：另開一個手機比例視窗，直接操作目前 Dota 戰場。
   這個入口不冒用學生帳號、不寫入雲端；只在教師目前開啟的頁面內傳送測試指令。 */
let MOBA_SIM_WIN=null;

/* ── 🏰 公會戰(每週五;組長持攻城卷帶隊參戰)── */
function siegeOpenToday(){
  const today = new Date().toLocaleDateString("sv");
  return new Date().getDay()===5 || state.siege.forceDate===today;
}
function siegeEntriesToday(){
  const today = new Date().toLocaleDateString("sv");
  const wk_ = lbWeekKey();
  state.siege.entries = (state.siege.entries||[]).filter(e=> e.week ? e.week===wk_ : e.date===today);   // v124:報名保留一整週(週五自動賽)
  return state.siege.entries;
}
/* 🏰 城堡商店管理(教師)+ 道具卡使用審查 */
function castleAdminHtml(){
  const rows = state.castleShopItems.map((it,i)=>
    '<div class="inline-form" style="margin-bottom:6px">'
    + '<input type="text" value="'+esc(it.icon)+'" data-csi="'+i+'" style="width:46px" title="圖示">'
    + '<input type="text" value="'+esc(it.name)+'" data-csn="'+i+'" style="width:100px" title="名稱">'
    + '<input type="text" value="'+esc(it.desc)+'" data-csd="'+i+'" style="flex:1;min-width:150px" title="說明">'
    + '<input type="number" value="'+it.price+'" data-csp="'+i+'" min="1" style="width:64px" title="鑽石價">💎'
    + '<button class="btn danger" data-csdel="'+i+'">✕</button></div>').join("");
  const logs = (state.realItemLog||[]).slice(-15).reverse().map(lg=>
    '<tr'+(lg.done?' style="opacity:.5"':'')+'><td class="mini num">'+esc(lg.t)+'</td>'
    + '<td>'+esc(lg.itemName)+'</td><td>'+esc(lg.byName)+' → <b>'+esc(lg.forName)+'</b></td>'
    + '<td>'+(lg.done?'<span class="mini">已執行</span>':'<button class="btn gold" data-csdone="'+lg.id+'" style="padding:2px 10px;font-size:12px">✓ 執行</button>')+'</td></tr>').join("")
    || '<tr><td colspan="4" class="mini">還沒有使用紀錄</td></tr>';
  return '<div class="panel"><h3>🏰 城堡商店管理(組長用💎兌換現實特權)</h3>'
    + '<div class="mini" style="margin-bottom:8px">日常指導只回饋金幣；受監督互評累積 20 件才可獲 1💎，且受每週上限約束。城主組組長可在自己頁面的「🏰 城堡商店」消費。</div>'
    + '<div style="text-align:left">'+rows+'</div>'
    + '<button class="btn" id="csAdd">➕ 新增道具卡</button>'
    + '<button class="btn gold" id="csSave">儲存商店設定</button>'
    + '<h3 style="margin-top:14px">🎟 道具卡使用紀錄(最近 15 筆)</h3>'
    + '<div style="max-height:30vh;overflow:auto"><table><thead><tr><th>時間</th><th>道具</th><th>使用</th><th></th></tr></thead><tbody>'+logs+'</tbody></table></div>'
    + '<div class="mini" style="margin-top:6px;color:#888">※ 改名申請、任務批改、學生創作審核已移至上方「✅ 審核」分頁統一處理。</div>'
    + '</div>';
}
/* 🏆 積分循環賽:每隊互打,勝3平1敗0,冠軍佔城 */
function tourStart(groups){
  const matches = [];
  for(let i=0;i<groups.length;i++) for(let j=i+1;j<groups.length;j++)
    matches.push({red:groups[i], blue:groups[j], done:false, result:""});
  const scores = {};
  groups.forEach(g=>{ scores[g] = {pts:0, w:0, d:0, l:0}; });
  state.siege.tournament = { teams:groups.slice(), matches, scores };
}
function tourRecord(red, blue, winTeam){                    // 單場結果回寫
  const t = state.siege.tournament; if(!t) return;
  const m = t.matches.find(x=>!x.done && x.red===red && x.blue===blue); if(!m) return;
  m.done = true;
  if(winTeam==="draw"){ m.result="平手"; t.scores[red].pts++; t.scores[blue].pts++; t.scores[red].d++; t.scores[blue].d++; }
  else{
    const w = winTeam==="red" ? red : blue, l = winTeam==="red" ? blue : red;
    m.result = w+" 勝";
    t.scores[w].pts += 3; t.scores[w].w++; t.scores[l].l++;
  }
  if(t.matches.every(x=>x.done)) tourFinish();
}
function tourRank(){
  const t = state.siege.tournament; if(!t) return [];
  return t.teams.slice().sort((a,b)=>
    t.scores[b].pts - t.scores[a].pts || t.scores[b].w - t.scores[a].w || t.teams.indexOf(a) - t.teams.indexOf(b));
}
function tourFinish(){                                      // 完賽:冠軍佔城+攻城卷結算
  const t = state.siege.tournament; if(!t) return;
  const champ = tourRank()[0];
  // 🎫 攻城卷已於「報名時」消耗一次,循環賽全程通行,完賽不再扣除
  const prev = state.castle.owner;
  state.castle.owner = champ;
  state.castle.since = new Date().toLocaleDateString("sv");
  addLog("-", "🏆 積分循環賽結束!"+champ+" 組"+(prev===champ?"守住了":"登上冠軍,佔領")+"榮耀之城!");
  state.siege.entries = [];
  state.siege.tournament = null;
  setTimeout(()=>{ levelUpFx("🏆 "+champ+" 組奪冠,佔領榮耀之城!"); sfx("goal"); }, 2600);
  save();
}
function siegeSetupHtml(){
  const offline = !CLOUD.on();
  const today = new Date().toLocaleDateString("sv");
  if(!siegeOpenToday()){
    return '<div class="panel"><h3>🏰 公會戰(攻城)</h3>'
      + '<div class="mini">組長購買「攻城卷」(💰500)報名<b>即消耗一張</b> → <b>每週五 20:00 自動積分循環賽</b>,一張券打完<b>本週所有場次</b>(循環賽一組要打很多場,不會重複扣券)。時間到後首次開啟系統時開打並保存 📼 回放,課堂可觀看。</div>'
      + '<div class="inline-form" style="margin-top:8px">'
      + '<button class="btn gold" id="siegeForce">🔓 立即開啟(僅今日)</button>'
      + '</div></div>';
  }
  const entries = siegeEntriesToday();
  const rows = state.groups.map(g=>{
    const lid = state.groupLeaders[g];
    const leader = lid ? stu(lid) : null;
    const nMem = state.students.filter(x=>x.group===g).length;
    const hasTicket = leader && ((leader.consumables||{})[31]||0) > 0;
    const entered = entries.some(e=>e.group===g);
    let action;
    if(entered) action = '<span class="tag" style="background:var(--gold)">✅ 已報名</span>';
    else if(!leader) action = '<span class="mini">尚未指定組長</span>';
    else if(!hasTicket) action = '<span class="mini">組長 '+esc(leader.name)+' 沒有攻城卷</span>';
    else action = '<button class="btn gold" data-siegejoin="'+esc(g)+'">🎫 用攻城卷報名('+esc(leader.name)+')</button>';
    return '<div class="group-manage-row"><span class="gm-name">'+esc(g)+' 組('+nMem+' 人)'+(leader?' 👑'+esc(leader.name):'')+'</span>'+action+'</div>';
  }).join("");
  const ent = entries.map(e=>e.group);
  const opts = (sel)=> ent.map(g=>'<option value="'+esc(g)+'">'+esc(g)+' 組</option>').join("");
  const c = state.castle;
  let castleInfo;
  if(c && c.owner){
    const days = Math.max(1, Math.round((Date.now() - new Date(c.since).getTime())/86400000) + 1);
    castleInfo = '<div style="background:linear-gradient(135deg,#fff6d8,#ffe9a8);border:3px solid #141414;border-radius:10px;padding:10px;margin-bottom:10px;text-align:center">'
      + '<div>'+castleImg(48)+'</div><b>👑 榮耀之城・現任城主:'+esc(c.owner)+' 組</b>'
      + '<div class="mini">佔領第 '+days+' 天・每日稅收全組 +15 金・擊敗城主組即可易主!</div></div>';
  }else{
    castleInfo = '<div class="mini" style="margin-bottom:8px">'+castleImg(28)+' 榮耀之城目前<b>無人佔領</b>——本次公會戰的勝者將成為首任城主(每日稅收 +15 金/人)!</div>';
  }
  const tour = state.siege.tournament;
  if(tour){                                                  // 🏆 循環賽進行中:賽程+積分榜
    const rank = tourRank();
    const board = rank.map((g,i)=>{
      const sc = tour.scores[g];
      return '<tr'+(i===0?' style="background:#fff3c9;font-weight:900"':'')+'><td>'+(i+1)+'</td><td>'+esc(g)+' 組</td>'
        + '<td class="num">'+sc.pts+'</td><td class="num">'+sc.w+'</td><td class="num">'+sc.d+'</td><td class="num">'+sc.l+'</td></tr>';
    }).join("");
    const ms = tour.matches.map((m,i)=>
      '<div class="group-manage-row"><span class="gm-name">第'+(i+1)+'戰:🔴'+esc(m.red)+' vs 🔵'+esc(m.blue)+'</span>'
      + (m.done ? '<span class="tag" style="background:var(--gold)">'+esc(m.result)+'</span>'
                : '<button class="btn gold" data-tourgo="'+i+'">⚔️ 開打</button>')+'</div>').join("");
    return '<div class="panel"><h3>🏆 公會戰・積分循環賽進行中</h3>'
      + castleInfo
      + '<div class="mini" style="margin-bottom:8px">勝 3 分・平 1 分・敗 0 分。全部打完,<b>積分最高者佔領榮耀之城</b>(同分比勝場)。每場照發公會戰獎勵；攻城卷已於報名時消耗一次，本週全部賽程不再扣券。</div>'
      + '<div class="group-manage-list">'+ms+'</div>'
      + '<h3 style="margin-top:12px">積分榜</h3>'
      + '<table><thead><tr><th>#</th><th>隊伍</th><th>積分</th><th>勝</th><th>平</th><th>敗</th></tr></thead><tbody>'+board+'</tbody></table>'
      + '<button class="btn danger" id="tourAbort" style="margin-top:8px">🛑 中止賽事(不佔城不耗卷)</button></div>';
  }
  return '<div class="panel"><h3>🏰 公會戰(攻城)・今日開戰!</h3>'
    + castleInfo
    + '<div class="mini" style="margin-bottom:8px">組長持攻城卷報名 → 兩組單場對決,或<b>三組以上積分循環賽</b>(全組入場,'+(offline?'<b>離線模式:AI 自動代打</b>':'學生手機遙控')+')。<b>公會戰加碼:勝組全員 +30XP +30金、敗組 +15XP。</b></div>'
    + '<div class="group-manage-list">'+rows+'</div>'
    + (ent.length>=2
       ? '<div class="inline-form" style="margin-top:10px">🔴<select id="siegeRed">'+opts()+'</select> vs 🔵<select id="siegeBlue">'+opts()+'</select>'
         + '<button class="btn gold" id="siegeStart">🏰 單場開戰</button>'
         + (ent.length>=3 ? '<button class="btn gold" id="tourStart" style="margin-left:8px">🏆 積分循環賽('+ent.length+' 隊 '+(ent.length*(ent.length-1)/2)+' 場)</button>' : '')
         + '</div>'
       : '<div class="mini" style="margin-top:8px">至少兩組報名後可開戰(已報名 '+ent.length+' 組)</div>')
    + '</div>'
    // 🌏 巔峰之城:世界攻防（最後階段才開放）
    + (classFeatureUnlocked("world")
      ? '<div class="panel" style="background:linear-gradient(135deg,#2d1b4e,#4a2a7a);color:#fff;border-color:#f0b429">'
        + '<h3 style="color:#f0b429">🌏 巔峰之城(世界攻防)</h3>'
        + '<div class="mini" style="color:#d8c9f0;margin-bottom:8px">全世界共享的一座城。現任霸主:<b style="color:#e23b3b;font-size:1.08em;text-shadow:0 1px 0 #fff,0 0 3px rgba(255,255,255,.72)">'+esc((state.worldPeak.owner||{}).className||"?")+'・'+esc((state.worldPeak.owner||{}).group||"?")+' 組</b>'
        + (PEAK.isOurs()?'(👑 就是本班!)':'')+'。挑戰規則:榮耀之城城主組長購買 🌏 巔峰券(城堡商店 500 金)→ 在此發起挑戰 → 與守軍快照 AI 對戰,獲勝即稱霸世界(全組 +50 XP +100 金,每日稅收 +30 金/人)。</div>'
        + '<div class="inline-form"><span class="mini" style="color:#d8c9f0">出戰小組:</span>'
        + '<select id="peakGrp">'+state.groups.filter(g=>state.students.some(x=>x.group===g)).map(g=>'<option value="'+esc(g)+'"'+(state.castle.owner===g?' selected':'')+'>'+esc(g)+' 組'+(state.castle.owner===g?'(城主)':'')+'</option>').join("")+'</select>'
        + '<button class="btn gold" id="peakGo">🌏 發起挑戰</button></div></div>'
      : '<div class="panel unlock-note">🔒 '+classFeatureLockText("world")+'</div>')
    + '<div class="panel"><h3>📼 戰鬥回放 <span class="mini">(自動保存最近 6 場,含每週自動公會戰)</span></h3>'
    + ((state.battleReplays||[]).length
      ? (state.battleReplays||[]).map((r,i)=>{
          const modeTag = r.mode==="weekly"?"🏆週賽":(r.mode==="peak"?"🌏巔峰":(r.mode==="siege"?"🏰攻城":"⚔️對戰"));
          const reds = Object.values(r.roster||{}).filter(x=>x.team==="red").map(x=>x.n).slice(0,2).join("、");
          const blues = Object.values(r.roster||{}).filter(x=>x.team==="blue").map(x=>x.n).slice(0,2).join("、");
          const winTxt = r.result ? (r.result.win==="red"?"🔴 紅勝":(r.result.win==="blue"?"🔵 藍勝":"平手")) : "?";
          return '<div class="inline-form" style="margin-bottom:4px"><span class="tag">'+modeTag+'</span><span class="mini">'+esc(r.date)+'</span><span style="flex:1;font-size:13px">🔴'+esc(reds)+'⋯ vs 🔵'+esc(blues)+'⋯</span><b>'+winTxt+'</b><button class="btn" data-replay="'+i+'">▶ 回放</button></div>';
        }).join("")
      : '<div class="mini">還沒有回放。打一場團體戰(或等週五自動公會戰)就會自動錄下來。</div>')
    + '</div>';
}
/* 🗺 戰場選擇器 */
function gaMapPicker(){
  const cur = GARENA.mapKey || "plain";
  const options = Object.values(BATTLE_MAPS).filter(m=>m.mode!=="moba").map(m=>{
    const ok = mapUnlocked(m.key);
    const eb = Object.values(ELEM_BOSSES).find(b=>b.map===m.key);
    return '<option value="'+m.key+'"'+(cur===m.key?' selected':'')+(ok?'':' disabled')+'>'+(ok?m.icon:'🔒')+' '+esc(m.name)+(ok?'':'（擊敗 '+esc(eb?eb.name:'對應魔王')+' 解鎖）')+'</option>';
  }).join("");
  return '<div class="arena-map-toolbar"><b class="mini">① 🗺 戰場</b><select id="gaMapSelect">'+options+'</select>'
    + '<button class="btn" data-gamap="__random" style="padding:5px 10px">🎲 隨機</button></div>'
    + '<div class="mini" style="margin:6px 0"><b>② 👥 分隊</b>・'+esc((BATTLE_MAPS[cur]||BATTLE_MAPS.plain).desc)+'</div>';
}
function garenaPickBoxes(){
  const box = (team,color)=> state.students.map(x=>
    '<label style="display:inline-flex;align-items:center;gap:4px;background:#fff;border:2px solid '+color+';border-radius:7px;padding:4px 8px;cursor:pointer;font-size:13px;font-weight:700">'
    + '<input type="checkbox" class="gaPick" data-team="'+team+'" value="'+x.id+'"> '+esc(x.name)+' <span class="mini">Lv'+x.level+'</span></label>').join(" ");
  // 快速分隊工具:按組別 / 隨機平均
  const grps = state.groups.filter(g=>state.students.some(x=>x.group===g));
  const grpBtns = grps.map(g=>'<button class="btn" data-qteam="'+esc(g)+'" style="padding:3px 10px;font-size:12px">'+esc(g)+'組</button>').join("");
  return '<div class="panel" style="background:#fff7e0;padding:8px 12px;margin-bottom:10px">'
    + '<div class="mini" style="font-weight:900;margin-bottom:6px">⚡ 快速分隊(免逐一勾選)</div>'
    + '<div class="inline-form" style="margin-bottom:6px"><span class="mini">🎲 </span>'
    + '<button class="btn gold" id="qsRandom" style="padding:4px 12px;font-size:13px">隨機平均分兩隊(全班)</button>'
    + '<button class="btn" id="qsClear" style="padding:4px 12px;font-size:13px">清空</button></div>'
    + (grps.length>=2 ? '<div class="inline-form"><span class="mini">🔴紅隊指定組:</span>'+grps.map(g=>'<button class="btn" data-qred="'+esc(g)+'" style="padding:3px 9px;font-size:12px">'+esc(g)+'</button>').join("")
        + '<span class="mini" style="margin-left:8px">🔵藍隊:</span>'+grps.map(g=>'<button class="btn" data-qblue="'+esc(g)+'" style="padding:3px 9px;font-size:12px">'+esc(g)+'</button>').join("")+'</div>' : "")
    + '</div>'
    + '<div style="margin-bottom:6px"><b style="color:#c0392b">🔴 紅隊:</b></div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">'+box("red","#c0392b")+'</div>'
    + '<div style="margin-bottom:6px"><b style="color:#2b6cb0">🔵 藍隊:</b></div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">'+box("blue","#2b6cb0")+'</div>';
}
function garenaBattleHtml(){
  const cells = GARENA.W * GARENA.H;
  const fs = Object.values(GARENA.fighters);
  // 戰場最大化:依視窗可用寬高,取能填滿的最大正方格
  const arenaFull=document.body.classList.contains("teacher-arena-battle-mode");
  const availW = (window.innerWidth || 1200) - (arenaFull?4:40);
  const viewportH = (window.visualViewport&&window.visualViewport.height)||window.innerHeight||800;
  const quizHasImage = !!(gaIsKnowledgeMoba()&&GARENA.mobaQuiz&&(GARENA.mobaQuiz.questionImage||GARENA.mobaQuiz.visualSvg));
  // 知識攻塔的題目與戰況列都進入正常版面，需先扣除實際可見高度，戰場才不會被題目壓住或超出螢幕。
  const quizReservedH = gaIsKnowledgeMoba() ? (quizHasImage?Math.min(150,viewportH*.18):74) : 0;
  const availH = viewportH - (arenaFull
    ? (gaIsKnowledgeMoba()?34+quizReservedH:(gaIsMoba()?8:42))
    : (gaIsKnowledgeMoba()?58+quizReservedH:(gaIsMoba()?64:120)));
  // 小螢幕與投影視窗都優先完整呈現整張戰場；過去最小 30px 在矮螢幕容易讓底部被截掉。
  GARENA.cell = Math.max(gaIsKnowledgeMoba()?12:24, Math.floor(Math.min(availW / GARENA.W, availH / GARENA.H)));
  const fhtml = fs.map(f=>{
    const st = stu(f.sid); if(!st) return "";
    const C = GARENA.cell||46;
    const sx=((f.entering?f.spawnX:f.x)*C+6), sy=((f.entering?f.spawnY:f.y)*C+4);
    return '<div class="ga-fighter ga-enter ga-face-'+(f.face||"down")+(f.ko?" ga-ko":"")+'" data-gfighter="'+f.sid+'" data-px="'+sx+'" data-py="'+sy+'" style="left:'+sx+'px;top:'+sy+'px;width:'+(C-12)+'px">'
      + '<div class="ga-hp"><i style="width:'+(f.hp/f.max*100)+'%;background:'+(f.team==="red"?"#e05252":"#5285e0")+'"></i></div>'
      + dollSVG(st, C-14)
      + '<div class="ga-nm" style="color:'+(f.team==="red"?"#c0392b":"#2b6cb0")+'">'+esc(st.name)+'</div></div>';
  }).join("");
  const C = GARENA.cell||46;
  return '<div class="ga-stage-max'+(gaIsMoba()?' ga-moba-stage':'')+(gaIsKnowledgeMoba()?' ga-knowledge-stage':'')+'">'
    + '<div id="gaWinner" class="ar-winner" style="display:none"></div>'
    + (gaIsKnowledgeMoba()?'<div id="gaKnowledgeCardHost">'+gaMobaKnowledgeCardHtml()+'</div>':'')
    // 知識攻塔的分數與 Combo 已整合到題目左右；其他模式才顯示戰況條。
    + (gaIsKnowledgeMoba()?'':'<div class="ga-topbar"><span style="color:#c0392b;font-weight:900">🔴 <span id="gaAliveR">'+fs.filter(f=>f.team==="red"&&!f.ko).length+'</span></span> <b>VS</b> <span style="color:#2b6cb0;font-weight:900"><span id="gaAliveB">'+fs.filter(f=>f.team==="blue"&&!f.ko).length+'</span> 🔵</span>'+(GARENA.mode==="moba"?'<span class="ga-moba-score">🔴核心 <span id="gaCoreR">'+Math.max(0,(gaMobaCore("red")||{}).hp||0)+'</span>　⚔　<span id="gaCoreB">'+Math.max(0,(gaMobaCore("blue")||{}).hp||0)+'</span> 核心🔵</span>':'')+' <span class="mini">剩 <span id="gaTime" class="num">'+Math.max(0,Math.ceil(GARENA.DURATION-(GARENA.elapsed||0)))+'</span>s</span></div>')
    // 戰場(最大化,置中)
    + '<div class="ga-field ga-field-max ga-map-'+gaMap().key+(fs.length>12||(GARENA.speed||1)>1?' ga-lite':'')+'" id="gaField" style="--ga-cell:'+C+'px;width:'+(GARENA.W*C)+'px;height:'+(GARENA.H*C)+'px'
      + (gaMap().bg ? ';background-image:'+gaMap().bg : '') + '">'
    + '<div class="ga-map-ribbon">'+gaMap().icon+' '+esc(gaMap().name)+'</div>'
    + '<div class="ga-door left" aria-hidden="true"></div><div class="ga-door right" aria-hidden="true"></div>'
    + '<div id="gaTerrain">'+gaTerrainHtml(C)+'</div>' + fhtml + '</div>'
    // Dota 一般／知識模式不顯示紀錄窗，保留最大戰術視野；團體競技場仍保留精簡戰況。
    + (gaIsMoba()?'':'<div id="gaLog" class="ga-log-corner"></div>')
    // 控制按鈕:右下懸浮(縮小)
    + '<div class="ga-ctrl-corner">'
    + (gaIsMoba()?'<button class="btn gold" id="mobaBattleQr" style="padding:4px 12px;font-size:13px">📱 參戰 QR</button> ':'')
    + (gaIsKnowledgeMoba()?'<button class="btn gold" id="mobaQuizPick" style="padding:4px 12px;font-size:13px">📚 更換題庫</button> ':'')
    + (GARENA.over ? "" : '<button class="btn" id="gaPause" style="padding:4px 12px;font-size:13px">'+(GARENA.paused?"▶ 繼續":"⏸ 暫停")+'</button> <button class="btn" id="gaSpeed" style="padding:4px 12px;font-size:13px">⏩ '+(GARENA.speed||1)+'倍</button> ')
    + '<button class="btn danger" id="gaQuit" style="padding:4px 12px;font-size:13px">'+(GARENA.over?"關閉":"結束")+'</button></div>'
    + (GARENA.over && GARENA.mvp ? garenaMvpHtml() : "")
    + '</div>';
}
function gaMobaKnowledgeCardHtml(){
  if(!gaIsKnowledgeMoba())return "";const q=GARENA.mobaQuiz;
  const score=GARENA.mobaKnowledgeScore||{red:0,blue:0},streak=GARENA.mobaKnowledgeStreak||{red:0,blue:0};
  const time=q?Math.max(0,Math.ceil(((((q.finished?q.nextAtTick:q.roundEndsTick)||0)-(GARENA.ticks||0))*.5))):0;
  if(!q)return '<div class="ga-knowledge-card"><div class="ga-knowledge-main"><div class="ga-team-score red"><span class="points">🔴 0</span><span class="combo">Combo ×0</span></div><span class="q">📚 等待教師選擇本場題庫</span><div class="ga-team-score blue"><span class="combo">Combo ×0</span><span class="points">0 🔵</span></div></div></div>';
  return '<div class="ga-knowledge-card"><div class="ga-knowledge-main"><div class="ga-team-score red"><span class="points">🔴 <span id="gaKnowR">'+score.red+'</span></span><span class="combo">Combo ×'+streak.red+'</span></div><span class="q">第 '+(q.round||1)+' 題｜'+esc(q.prompt)+' <span class="ga-knowledge-time">剩 <span id="gaTime">'+time+'</span>s</span></span><div class="ga-team-score blue"><span class="combo">Combo ×'+streak.blue+'</span><span class="points"><span id="gaKnowB">'+score.blue+'</span> 🔵</span></div></div>'+quizGeometryHtml(q.visualSvg,"ga-geometry")+quizImageHtml(q.questionImage,"ga-question-img","題目圖片")+'</div>';
}
/* tick 局部更新(不整頁重繪) */
/* 🗺 戰場地形視覺層:障礙物 + 地形格 + 落石預警 */
function gaTerrainHtml(C){
  const M = gaMap();
  let h = "";
  const ICON = { lava:"🔥", ember:"🟠", steam:"💨", crack:"🕸", snow:"❄",
                 quicksand:"🕳", gravel:"⚱", oasis:"🌴",
                 windR:"💨", windL:"💨", tornado:"🌀", updraft:"⬆",river:"≈",brush:"♧",lane:"" };
  const CLR  = { lava:"rgba(255,90,30,.38)", ember:"rgba(255,150,50,.22)", steam:"rgba(220,235,245,.5)",
                 crack:"rgba(90,140,190,.3)", snow:"rgba(255,255,255,.55)",
                 quicksand:"rgba(190,150,70,.34)", gravel:"rgba(150,130,100,.26)", oasis:"rgba(70,190,120,.3)",
                 windR:"rgba(140,200,255,.24)", windL:"rgba(140,200,255,.24)",
                 tornado:"rgba(120,170,220,.4)", updraft:"rgba(180,255,220,.3)",
                 river:"rgba(80,180,220,.34)",brush:"rgba(25,105,48,.38)",lane:"rgba(232,214,153,.20)" };
  // 地形格
  for(let x=0; x<GARENA.W; x++) for(let y=0; y<GARENA.H; y++){
    const z = gaZoneAt(x,y);
    if(!z) continue;
    h += '<div class="ga-zone" style="left:'+(x*C)+'px;top:'+(y*C)+'px;width:'+C+'px;height:'+C+'px;'
       + 'background:'+(CLR[z.kind]||"rgba(0,0,0,.1)")+'">'+(ICON[z.kind]||"")+'</div>';
  }
  // 障礙物
  const OB_ICON = { ice:"🧊", volcano:"🪨", wind:"🌀", desert:"🌵", plain:"🪨",moba:"⛰️" };
  const oi = OB_ICON[M.key] || "🪨";
  (M.obstacles||[]).forEach(o=>{
    if(o[0]>=GARENA.W || o[1]>=GARENA.H) return;
    h += '<div class="ga-obst" style="left:'+(o[0]*C)+'px;top:'+(o[1]*C)+'px;width:'+C+'px;height:'+C+'px">'+oi+'</div>';
  });
  (GARENA.structures||[]).forEach(q=>{
    const pct=Math.max(0,Math.round(q.hp/q.max*100)), damageClass=(q.type==="crystal"||q.type==="quizTower")?'':(pct<=30?' ga-critical':(pct<=65?' ga-damaged':''));
    const art=q.type==="core"
      ? '<div class="ga-structure-art" aria-hidden="true"><i class="ga-core-base"></i><i class="ga-core-turret left"></i><i class="ga-core-turret right"></i><i class="ga-core-keep"></i><i class="ga-core-gate"></i><i class="ga-core-gem"></i></div>'
      : (q.type==="crystal"
        ? '<div class="ga-structure-art" aria-hidden="true"><i class="ga-spawn-crystal-base"></i><i class="ga-spawn-crystal-gem"></i><i class="ga-spawn-crystal-ring"></i></div>'
        : '<div class="ga-structure-art" aria-hidden="true"><i class="ga-tower-base"></i><i class="ga-tower-body"></i><i class="ga-tower-crown"></i><i class="ga-tower-crystal"></i>'+(q.type==="quizTower"?'<b class="ga-quiz-tower-letter">'+esc(q.answer||'?')+'</b>':'')+'</div>');
    const hpText=q.type==="core"?'耐久 '+q.hp+'/'+q.max+' 擊':Math.ceil(q.hp)+' / '+Math.ceil(q.max);
    const optionIndex=Math.max(0,"ABCD".indexOf(q.answer||"A")),towerOption=q.type==="quizTower"&&GARENA.mobaQuiz?'<span class="ga-quiz-tower-option">'+quizImageHtml((GARENA.mobaQuiz.optionImages||[])[optionIndex],"ga-tower-option-img",(q.answer||"")+" 選項圖片")+'<b>'+esc(q.answer||"")+'</b>　'+esc((GARENA.mobaQuiz.options||[])[optionIndex]||"等待題目")+'</span>':"";
    h+='<div class="ga-structure ga-'+q.team+' ga-'+q.type+damageClass+(q.alive===false?' ga-dead':'')+'" style="left:'+(q.x*C)+'px;top:'+(q.y*C)+'px;width:'+C+'px;height:'+C+'px">'
      +((q.type!=="crystal"&&q.type!=="quizTower")?'<div class="ga-structure-hp"><i style="width:'+pct+'%"></i><b>'+hpText+'</b></div>':'')+towerOption+art+'<div class="ga-structure-name">'+esc(q.type==="core"?'核心城堡':(q.type==="crystal"?'無敵重生水晶':(q.type==="quizTower"?(q.answer||"")+" 選項塔":'守路箭塔')))+'</div></div>';
  });
  if(gaIsKnowledgeMoba()&&GARENA.mobaQuiz){
    const q=GARENA.mobaQuiz,fs=Object.values(GARENA.fighters||{});
    ["red","blue"].forEach(team=>gaMobaQuizZones(team).forEach(z=>{const holder=fs.find(f=>!f.ko&&f.team===team&&f.x===z.x&&f.y===z.y),charge=holder&&holder.quizChargeKey===team+":"+z.answer?Math.min(100,Math.round((holder.quizChargeT||0)/6*100)):0,wrong=(q.wrong[team]||[]).includes(z.answer),answered=q.answeredTeams[team]&&z.answer===q.correct;color=team==="red"?"#e05252":"#5285e0";h+='<div class="ga-answer-domain '+(wrong?'wrong ':'')+(answered?'answered':'')+'" style="left:'+(z.x*C)+'px;top:'+(z.y*C)+'px;width:'+C+'px;height:'+C+'px;--team-color:'+color+';--charge:'+charge+'" title="'+(team==="red"?'紅隊攻城答案':'藍隊攻城答案')+' '+z.answer+'">'+z.answer+'<small>'+charge+'%</small></div>'; }));
    const tick=GARENA.ticks||0;if((q.freezeUntil.red||0)>tick)h+='<div class="ga-quiz-freeze red" data-ga-freeze="red">🧊 紅隊凍結 <span>'+Math.ceil((q.freezeUntil.red-tick)*.5)+'</span>s</div>';if((q.freezeUntil.blue||0)>tick)h+='<div class="ga-quiz-freeze blue" data-ga-freeze="blue">🧊 藍隊凍結 <span>'+Math.ceil((q.freezeUntil.blue-tick)*.5)+'</span>s</div>';
  }
  // 落石預警
  const evKind = (M.event||{}).kind;
  if(evKind === "eruption") (GARENA.warnCells||[]).forEach(w=>{
    h += '<div class="ga-warn" style="left:'+(w[0]*C)+'px;top:'+(w[1]*C)+'px;width:'+C+'px;height:'+C+'px">☄️</div>';
  });
  // 玩家可見的戰術物件：陷阱貼地、召喚物漂浮在格子旁，不會遮住角色或阻擋走位。
  (GARENA.traps||[]).forEach(t=>{
    h += '<div class="ga-ground-trap" title="'+(t.kind==='void'?'虛空陷阱':'遊俠陷阱')+'" style="left:'+(t.x*C)+'px;top:'+(t.y*C)+'px;width:'+C+'px;height:'+C+'px">'+(t.icon||'🪤')+'</div>';
  });
  (GARENA.summons||[]).forEach(u=>{
    const guardText=u.id==='shield_squire' ? '・護盾 '+Math.max(0,u.guardHp||0)+'/'+Math.max(0,u.guardMax||0) : '';
    h += '<div class="ga-summon '+(u.id==='shield_squire'?'ga-squire':'')+'" title="'+esc(u.name+guardText)+'" style="left:'+(u.x*C)+'px;top:'+(u.y*C)+'px;width:'+C+'px;height:'+C+'px">'+u.icon+'</div>';
  });
  (GARENA.fields||[]).forEach(q=>{
    const wide=['sky_guard','elemental_ruin','arrow_barrage','miracle_field'].includes(q.id), radius=wide?2:1, size=C*(radius*2+1);
    h += '<div class="ga-legend-field" title="'+esc(q.name)+'" style="left:'+((q.x-radius)*C)+'px;top:'+((q.y-radius)*C)+'px;width:'+size+'px;height:'+size+'px">'+q.icon+'</div>';
  });
  return h;
}
function garenaRenderField(){
  const fs = Object.values(GARENA.fighters);
  const quizHost=document.getElementById("gaKnowledgeCardHost");
  if(quizHost&&gaIsKnowledgeMoba()){
    const q=GARENA.mobaQuiz||{},quizCardSig=JSON.stringify([q.id||"",q.round||0,q.prompt||"",q.questionImage||"",GARENA.mobaKnowledgeScore||{},GARENA.mobaKnowledgeStreak||{}]);
    if(quizHost.dataset.sig!==quizCardSig){quizHost.dataset.sig=quizCardSig;quizHost.innerHTML=gaMobaKnowledgeCardHtml();}
  }
  // 🗺 地形層即時更新(落石預警等動態元素才會出現)
  const terr = document.getElementById("gaTerrain");
  if(terr){
    const quizSig=gaIsKnowledgeMoba()?JSON.stringify(GARENA.mobaQuiz||{})+"|"+fs.map(f=>f.sid+":"+(f.quizChargeKey||"")+":"+(f.quizChargeT||0)).join(","):"";
    // 冷卻、剩餘回合等不可見欄位不納入簽章，避免 15v15 時每半秒重建整張地圖 DOM。
    const trapSig=(GARENA.traps||[]).map(t=>[t.id||t.kind,t.x,t.y]);
    const summonSig=(GARENA.summons||[]).map(u=>[u.id,u.x,u.y,u.guardHp||0]);
    const fieldSig=(GARENA.fields||[]).map(q=>[q.id,q.x,q.y]);
    const structureSig=(GARENA.structures||[]).map(q=>[q.id,q.hp,q.alive!==false]);
    const sig = (GARENA.mapKey||"plain") + "|" + JSON.stringify(GARENA.warnCells||[]) + "|" + JSON.stringify(trapSig) + "|" + JSON.stringify(summonSig) + "|" + JSON.stringify(fieldSig) + "|" + JSON.stringify(structureSig) + "|" + quizSig;
    if(terr.dataset.sig !== sig){
      terr.dataset.sig = sig;
      terr.innerHTML = gaTerrainHtml(GARENA.cell||46);
    }
  }
  document.querySelectorAll('[data-ga-freeze]').forEach(el=>{const team=el.dataset.gaFreeze,left=Math.max(0,Math.ceil((((GARENA.mobaQuiz||{}).freezeUntil||{})[team]-(GARENA.ticks||0))*.5));el.hidden=left<=0;const n=el.querySelector('span');if(n)n.textContent=left;});
  for(const f of fs){
    // render() 會重建整個教師端戰場；舊快取雖仍是物件，實際上已脫離畫面。
    // 手機讀取 GARENA.fighters 所以仍會移動，但若繼續更新舊節點，大屏角色就會看似站在原地。
    let el = GARENA._els && GARENA._els[f.sid];
    if(!el || !el.isConnected || !el.matches('[data-gfighter="'+CSS.escape(String(f.sid))+'"]')){
      el = document.querySelector('[data-gfighter="'+CSS.escape(String(f.sid))+'"]');
      GARENA._els = GARENA._els || {};
      if(el) GARENA._els[f.sid] = el;
    }
    if(!el) continue;
    el.dataset.atb=String(Math.round(f.atb||0));el.dataset.entering=f.entering?"1":"0";el.dataset.ai=GARENA.aiMode||f.autoPilot?"1":"0";el.dataset.cmd=GARENA.cmdQueue[f.sid]?"1":"0";
    GARENA._els = GARENA._els || {}; GARENA._els[f.sid] = el;
    const C = GARENA.cell||46; const _nx=(f.x*C+6), _ny=(f.y*C+4);
    if(f.entering){
      // 尚未輪到的角色留在左右門口隊列，不讓 tick 把他們直接傳送到戰場內。
      continue;
    }
    if(!el.dataset.idleInit){                                 // 🧍 idle 相位錯開:每人呼吸節奏不同步
      el.dataset.idleInit = "1";
      const sv = el.querySelector("svg");
      if(sv) sv.style.animationDelay = (-Math.random()*2.4).toFixed(2)+"s";
    }
    if(el.dataset.px!==undefined && (+el.dataset.px!==_nx || +el.dataset.py!==_ny) && !f.ko){   // 🚶 位置改變→走路步伐
      el.classList.add("ga-walk");
      clearTimeout(el._walkT);
      el._walkT = setTimeout(()=>{ el.classList.remove("ga-walk"); }, 460);
    }
    if(el.dataset.px!==String(_nx) || el.dataset.py!==String(_ny)){
      el.dataset.px = _nx; el.dataset.py = _ny;
      // 座標只用 left/top；攻擊、受擊、倒地動畫可自由使用 transform，不會再跳回左上角。
      el.style.left = _nx+"px"; el.style.top = _ny+"px";
    }
    const face=f.face||"down";
    if(el.dataset.face!==face){ el.dataset.face=face; el.classList.remove("ga-face-up","ga-face-down","ga-face-left","ga-face-right"); el.classList.add("ga-face-"+face); }
    const bar = el.querySelector(".ga-hp i");
    const hp=Math.max(0,Math.round(f.hp/f.max*100));
    if(bar && bar.dataset.hp!==String(hp)){ bar.dataset.hp=hp; bar.style.width = hp+"%"; }
    el.classList.toggle("ga-ko", !!f.ko);
    el.style.opacity = f.stealth>0 ? .35 : "";               // 🌫 隱身半透明(大屏仍隱約可見)
    el.style.outline = f.tauntT>0 ? "3px dashed #f5731f" : ((f.hunterMarkT||0)>0 ? "3px dashed #a98cff" : "");   // 📣 嘲諷／👁️ 印記
    el.classList.toggle("ga-frozen", (f.frozenT||0)>0 && !f.ko);                          // 🧊 凍結:冰塊覆蓋+去色
    el.classList.toggle("ga-chilled", (f.frozenT||0)<=0 && (f.chillT||0)>0 && !f.ko);     // ❄️ 冰緩:藍調+旋轉雪花
    el.classList.toggle("ga-exposed", !!f.exposed && !f.ko);                              // 🌪 破綻:紫光標記
    el.classList.toggle("ga-blizzard", (f.blizzardT||0)>0 && !f.ko);                       // 🌨 暴風雪殘留雪雲
    el.classList.toggle("ga-taunting", (f.tauntingT||0)>0 && !f.ko);                       // 📢 嘲諷施放者
    el.classList.toggle("ga-taunted", (f.tauntT||0)>0 && !f.ko);                            // 🎯 被嘲諷強制鎖定
    el.classList.toggle("ga-execute", (f.executeT||0)>0 && !f.ko);                          // ☠️ 斬殺命中
    const teamHasAegis = Object.values(GARENA.fighters).some(o=>o.team===f.team && !o.ko && activeSkillLv(stu(o.sid)||{skills:{}},"aegis")>0);
    el.classList.toggle("ga-aegis", teamHasAegis && !f.ko);                                // 🛡 庇護:隊友皆顯示護環
    const stL = stu(f.sid);
    el.classList.toggle("lord-peak", !!(stL && !f.ko && isPeakLord(stL)));               // 👑 巔峰城主紅光
    el.classList.toggle("lord-glory", !!(stL && !f.ko && !isPeakLord(stL) && isGloryLord(stL)));   // 榮耀城主橘光
    const oldOrbit=el.querySelector(".ga-pet");if(oldOrbit)oldOrbit.remove(); // 寵物改由紙娃娃腳邊固定圖層呈現，避免重複顯示
  }
  const t = document.getElementById("gaTime");
  if(t) t.textContent = Math.max(0, Math.ceil(GARENA.DURATION - (GARENA.elapsed||0)));
  const ar = document.getElementById("gaAliveR"), ab = document.getElementById("gaAliveB");
  if(ar) ar.textContent = fs.filter(f=>f.team==="red"&&!f.ko).length;
  if(ab) ab.textContent = fs.filter(f=>f.team==="blue"&&!f.ko).length;
  const kr=document.getElementById("gaKnowR"),kb=document.getElementById("gaKnowB"),ks=GARENA.mobaKnowledgeScore||{red:0,blue:0};
  if(kr)kr.textContent=ks.red||0;if(kb)kb.textContent=ks.blue||0;
  const cr=document.getElementById("gaCoreR"),cb=document.getElementById("gaCoreB");
  if(cr)cr.textContent=Math.max(0,(gaMobaCore("red")||{}).hp||0);
  if(cb)cb.textContent=Math.max(0,(gaMobaCore("blue")||{}).hp||0);
}
let garenaViewportResizeTimer=0;
function scheduleGarenaViewportFit(){
  if(!GARENA||!GARENA.active)return;
  clearTimeout(garenaViewportResizeTimer);
  garenaViewportResizeTimer=setTimeout(()=>{
    GARENA._els={};
    render();
    requestAnimationFrame(garenaRenderField);
  },120);
}
window.addEventListener("resize",scheduleGarenaViewportFit,{passive:true});
if(window.visualViewport)window.visualViewport.addEventListener("resize",scheduleGarenaViewportFit,{passive:true});
function arenaBattleHtml(){
  const A = stu(ARENA.a), B = stu(ARENA.b);
  return '<div class="arena-stage">'
    + '<div id="arWinner" class="ar-winner" style="display:none"></div>'
    + '<div class="ar-row">'
    + '<div class="ar-side"><div class="ar-name">'+esc(A.name)+' <span class="mini num">Lv.'+A.level+'</span></div>'
    + '<div class="ar-hpbar"><i id="hpA" style="width:100%"></i></div><div class="mini num" id="hpAt">'+ARENA.hpA+'/'+ARENA.maxA+'</div></div>'
    + '<div class="ar-vs">VS</div>'
    + '<div class="ar-side"><div class="ar-name">'+esc(B.name)+' <span class="mini num">Lv.'+B.level+'</span></div>'
    + '<div class="ar-hpbar"><i id="hpB" style="width:100%"></i></div><div class="mini num" id="hpBt">'+ARENA.hpB+'/'+ARENA.maxB+'</div></div>'
    + '</div>'
    + '<div class="ar-field">'
    + '<div class="ar-fighter">'
    + '<div class="ar-doll" id="dollA">'+dollSVG(A,150)+'</div>'
    + '<div class="ar-gauge"><i id="gaugeA" style="width:0%"></i></div>'
    + '<div class="ar-glabel">⚡ 行動</div>'
    + '</div>'
    + '<div class="ar-fighter">'
    + '<div class="ar-doll ar-flip" id="dollB">'+dollSVG(B,150)+'</div>'
    + '<div class="ar-gauge"><i id="gaugeB" style="width:0%"></i></div>'
    + '<div class="ar-glabel">⚡ 行動</div>'
    + '</div>'
    + '</div>'
    + '<div id="arLog" class="ar-log"></div>'
    + '<div style="text-align:center;margin-top:10px">'
    + '<button class="btn" id="arPause">'+(ARENA.timer?"⏸ 暫停":"▶ 繼續")+'</button> '
    + '<button class="btn" id="arSpeed">⏩ 速度 x'+ARENA.speed+'</button> '
    + '<button class="btn danger" id="arQuit">結束離場</button></div>'
    + '</div>';
}
function teacherTitles(){
  const stuOpts = state.students.map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join("");
  const effOpts = [
    ["atk3","⚔ ATK +3"],["def3","🛡 DEF +3"],["agi3","💨 AGI +3"],["int3","🔮 INT +3"],
    ["hp20","❤️ HP 上限 +20"],["xp10","✨ XP +10%"],["gold10","💰 金幣 +10%"],
    ["all1","👑 全屬性 +1"],["off10","🏷 商店 9 折"],["none","(無效果,純榮譽)"]
  ].map(([k,n])=>'<option value="'+k+'">'+n+'</option>').join("");
  const rows = TITLE_DEFS.map(t=>
    '<tr><td><b>【'+esc(t.name)+'】</b></td><td>'+esc(t.fx)+'</td><td class="mini">'+esc(t.hint)+'</td>'
    + '<td><select data-grantsel="'+esc(t.name)+'" style="max-width:110px">'+stuOpts+'</select> '
    + '<button class="btn gold" data-grant="'+esc(t.name)+'">頒發</button></td></tr>').join("");
  const customRows = (state.customTitleDefs||[]).map((t,i)=>
    '<tr><td><b>【'+esc(t.name)+'】</b></td><td>'+esc(t.fx||"—")+'</td><td class="mini">自訂</td>'
    + '<td><select data-grantsel="'+esc(t.name)+'" style="max-width:110px">'+stuOpts+'</select> '
    + '<button class="btn gold" data-grant="'+esc(t.name)+'">頒發</button> '
    + '<button class="btn danger" data-tddel="'+i+'">刪除</button></td></tr>').join("");
  const ownedRows = state.students.filter(x=>ownedTitles(x).length).map(x=>
    '<tr><td>'+esc(x.name)+'</td><td>'+ownedTitles(x).map(t=>
      '<span class="badge">【'+esc(t)+'】'+(x.title===t?" ✓配戴中":"")
      + ' <a href="#" data-revoke="'+x.id+'|'+esc(t)+'" style="color:#c0392b;text-decoration:none">✕</a></span>').join(" ")
    + '</td></tr>').join("") || '<tr><td colspan="2" class="mini">還沒有學生獲得稱號</td></tr>';
  return '<div class="title-menu-grid">'
    +'<details class="panel arena-menu-card title-menu-card"><summary>🎖 稱號目錄與頒發</summary><div class="arena-menu-body"><div class="mini" style="margin-bottom:8px">僅教師可見；配戴才生效。「建議頒發時機」只是參考，也可在任務獎勵中設定自動頒發。</div><div class="title-table-scroll"><table><thead><tr><th>稱號</th><th>隱藏效果</th><th>建議頒發時機</th><th>頒發給</th></tr></thead><tbody>'+rows+customRows+'</tbody></table></div></div></details>'
    +'<details class="panel arena-menu-card title-menu-card"><summary>➕ 建立自訂稱號</summary><div class="arena-menu-body"><div class="inline-form"><input type="text" id="tdName" placeholder="稱號名稱（例：朗讀之星）" style="width:170px"><select id="tdEff">'+effOpts+'</select><button class="btn gold" id="tdAdd">建立</button></div></div></details>'
    +'<details class="panel arena-menu-card title-menu-card"><summary>📜 已頒發紀錄與撤回</summary><div class="arena-menu-body"><div class="title-table-scroll"><table><tbody>'+ownedRows+'</tbody></table></div></div></details></div>';
}
function teacherRank(){
  const byName = [...state.students].sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"zh-Hant"));
  const rows = byName.map(st=>{
    return '<tr><td>'+dollSVG(st,30)+' '+esc(st.name)
      + '</td><td class="mini">'+esc(st.group)+' 組</td><td class="num" style="text-align:right">Lv.'+st.level
      + '</td><td class="num" style="text-align:right">'+(st.totalXp||0)+' XP</td></tr>';
  }).join("") || '<tr><td class="mini">尚無學生</td></tr>';
  const gRank = state.groups.map(g=>({g, xp: state.students.filter(x=>x.group===g).reduce((a,x)=>a+(x.totalXp||0),0)}))
    .map(r=>'<tr><td>'+esc(r.g)+' 組</td><td class="num" style="text-align:right">'+r.xp+' XP</td></tr>').join("");
  const world = !classFeatureUnlocked("world")
    ? '<div class="panel"><h3>🌍 跨班世界系統</h3><div class="mini">'+esc(classFeatureLockText("world"))+'。教師可在「解鎖進度」個別開啟。</div></div>'
    : (CLOUD.on()
    ? '<div class="panel"><h3>🌍 世界排行榜</h3>'
      + (state.lbOptIn
        ? '<div class="mini" style="margin-bottom:8px">本班參加中(暱稱:'+esc(state.lbName||"")+')</div>'
        : '<div class="mini" style="margin-bottom:8px">尚未參加——到「名冊管理」開啟並取暱稱,全班一起跟其他班級較勁!</div>')
      + '<button class="btn gold" id="tRankWorld">看世界排行榜</button></div>'
    : '<div class="panel"><h3>🌍 世界排行榜</h3><div class="mini">需要登入雲端班級才能使用。</div></div>');
  return '<div class="rank-grid">'
    + '<div class="panel"><h3>📘 學生學習進度（僅教師）</h3><div class="mini">依姓名排列，不顯示名次或落後標記。</div><table><tbody>'+rows+'</tbody></table></div>'
    + '<div class="panel"><h3>🤝 小組共同進度</h3><div class="mini">依班級分組順序呈現，不以獎牌製造組間排名。</div><table><tbody>'+gRank+'</tbody></table></div>'
    + world
    + '</div>';
}
function bossBanner(){
  const b = state.boss; if(!b) return "";
  if(!b.standby) b.standby = {};
  const pct = Math.round(b.hp/b.maxHp*100);
  const g = nextAttackGroup();
  const order = [...new Set(state.students.map(x=>x.group))]
    .filter(gr=>state.students.some(x=>x.group===gr))
    .sort((a,c)=>groupAvgAgi(c)-groupAvgAgi(a));
  const orderStr = order.map(gr=>{
    const done = !state.students.some(x=>x.group===gr && x.currentHp>0 && !b.standby[x.id]);
    return (gr===g?'▶':'')+gr+(done?'✓':'');
  }).join(' → ');
  return '<div class="panel"><div class="goal-wrap">'
    + '<b style="color:var(--hp)" data-bossanchor="1">🐉 '+esc(b.name)+'</b>'
    + '<div class="goal-bar boss-bar"><i style="width:'+pct+'%"></i><span class="num">'+b.hp+' / '+b.maxHp+' HP</span></div></div>'
    + '<div style="margin-top:8px;font-weight:700;color:#141414">出手順序:'+esc(orderStr||"—")+'</div>'
    + '<div class="inline-form" style="margin-top:10px">'
    + '<button class="btn gold" id="bsGroupAtk"'+(g?"":" disabled")+'>⚔️ '+(g?g+' 組攻擊':'全部打完')+'</button>'
    + '<button class="btn" id="bsSkip"'+(g?"":" disabled")+'>⏭ 跳過本組</button>'
    + '<button class="btn danger" data-bscounter="1">🐉 Boss 反擊</button>'
    + '<button class="btn" id="bsRestBoard">全員休息</button></div>'
    + '</div>';
}
/* 每日閘門進度列(大屏頂部) */
function progBannerHtml(){
  const pg = progCheck();
  const pct = Math.min(100, Math.round(pg.exploreXp / Math.max(1,pg.exploreGoal) * 100));
  const stages = [
    pg.stage===0 ? '🗺 <b>探索中</b>' : '🗺 ✅',
    pg.stage===0 ? '<span style="opacity:.4">⚔️ 魔王</span>' : (pg.stage===1 ? '⚔️ <b>魔王討伐中</b>' : '⚔️ ✅'),
    pg.stage<2 ? '<span style="opacity:.4">🏟 競技場</span>' : '🏟 <b>已開放</b>'
  ];
  const castleTag = state.castle && state.castle.owner
    ? '<span style="background:linear-gradient(135deg,#f5c518,#e2a500);border:2px solid #141414;border-radius:8px;padding:2px 10px;font-weight:900;font-size:13px">👑 榮耀之城・'+esc(state.castle.owner)+' 組</span>'
    : '<span class="mini" style="opacity:.6">👑 榮耀之城・無人佔領</span>';
  return '<div class="panel" style="padding:8px 14px;margin-bottom:10px">'
    + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
    + '<b class="mini">今日冒險</b>'
    + '<span style="font-size:14px">'+stages.join(' <span style="opacity:.35">→</span> ')+'</span>'
    + (pg.stage===0
       ? '<span style="flex:1;min-width:120px;height:12px;background:#eee;border:2px solid #141414;border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:'+pct+'%;background:var(--gold)"></i></span>'
         + '<span class="num mini">'+pg.exploreXp+' / '+pg.exploreGoal+' XP</span>'
         + '<a href="#" id="progGoalEdit" class="mini" style="color:#888">⚙</a>'
       : '')
    + (pg.stage<2 ? ' <button class="btn" id="progUnlock" style="padding:2px 10px;font-size:12px">🔓 教師直接解鎖</button>' : '')
    + '<span class="hsp"></span>' + castleTag
    + '</div></div>';
}
function castingBanner(){
  const b = state.boss;
  if(!b || !b.casting) return "";
  return '<div class="cast-banner">⚠️ 「'+esc(b.name)+'」正在詠唱【烈焰隕石】!下一次「Boss 反擊」將對全體造成無視防禦傷害 ⚠️</div>';
}
let boardFitFrame=0;
function bestBoardMemberLayout(memberCount, cardWidth, cardHeight){
  const n=Math.max(1,memberCount||1), gap=4, innerW=Math.max(24,cardWidth-14), innerH=Math.max(20,cardHeight-38);
  let best={cols:1,rows:n,score:0};
  for(let cols=1;cols<=n;cols++){
    const rows=Math.ceil(n/cols);
    const cellW=(innerW-gap*(cols-1))/cols, cellH=(innerH-gap*(rows-1))/rows;
    const score=Math.min(cellW,cellH/1.32);
    if(score>best.score) best={cols,rows,score};
  }
  return best;
}
function fitTeacherBoard(){
  if(view.page!=="teacher" || view.tview!=="board") return;
  const wall=app.querySelector(".board-focus"), quick=app.querySelector(".board-quickbar");
  if(!wall) return;
  const cards=[...wall.querySelectorAll(".group-card")], header=document.querySelector("body>header");
  document.body.style.setProperty("--board-header-height",Math.ceil(header?header.getBoundingClientRect().height:54)+"px");
  if(!cards.length) return;
  const top=wall.getBoundingClientRect().top;
  const bottom=quick ? quick.getBoundingClientRect().top-5 : window.innerHeight-7;
  const availableH=Math.max(72,Math.floor(bottom-top));
  const availableW=Math.max(180,Math.floor(wall.clientWidth));
  const groupGap=availableH<500?5:7, count=cards.length;
  let best=null;
  for(let cols=1;cols<=count;cols++){
    const rows=Math.ceil(count/cols);
    const cardW=(availableW-groupGap*(cols-1))/cols;
    const cardH=(availableH-groupGap*(rows-1))/rows;
    const layouts=cards.map(card=>bestBoardMemberLayout(+card.dataset.memberCount||0,cardW,cardH));
    const minScore=Math.min(...layouts.map(x=>x.score));
    const balancePenalty=Math.abs((cardW/Math.max(1,cardH))-1.15)*.35;
    const score=minScore-balancePenalty;
    if(!best || score>best.score) best={cols,rows,cardW,cardH,layouts,score,minScore};
  }
  wall.style.setProperty("--board-cols",best.cols);
  wall.style.setProperty("--board-rows",best.rows);
  wall.style.setProperty("--board-wall-height",availableH+"px");
  wall.style.setProperty("--board-gap",groupGap+"px");
  wall.style.setProperty("--board-card-pad",(best.cardH<175?4:7)+"px");
  wall.style.setProperty("--board-member-gap",(best.minScore<42?2:4)+"px");
  wall.style.setProperty("--board-group-font",Math.max(9,Math.min(14,Math.round(best.minScore*.22)))+"px");
  wall.style.setProperty("--board-action-font",Math.max(8,Math.min(11,Math.round(best.minScore*.18)))+"px");
  wall.style.setProperty("--board-name-font",Math.max(8,Math.min(13,Math.round(best.minScore*.2)))+"px");
  wall.style.setProperty("--board-title-font",Math.max(7,Math.min(10,Math.round(best.minScore*.15)))+"px");
  cards.forEach((card,i)=>{
    card.style.setProperty("--member-cols",best.layouts[i].cols);
    card.style.setProperty("--member-rows",best.layouts[i].rows);
  });
}
function scheduleTeacherBoardFit(){
  cancelAnimationFrame(boardFitFrame);
  boardFitFrame=requestAnimationFrame(fitTeacherBoard);
}
window.addEventListener("resize",scheduleTeacherBoardFit,{passive:true});
function teacherBoard(){
  const lesson=state.lesson||{};
  const courseBtn='<a class="btn board-course-link" href="'+COURSE_CATALOG_URL+'" target="_blank" rel="noopener" title="開啟課後複習課程">📚 課程目錄</a>';
  if(lesson.active&&lesson.mode==="zone")return zoneBoardHtml()+'<button class="btn zone-back-floating" id="zoneBack">← 返回大屏</button>'+courseBtn;
  const walls = state.groups.map(gn=>{
    const members = state.students.filter(s=>s.group===gn);
    const mm = members.map(s=>{
      const bd = s.title ? "【"+esc(s.title)+"】" : "";
      const effMax = s.maxHp + skillMaxHpBonus(s);
      const hpPct = Math.max(0, Math.round(s.currentHp/effMax*100));
      const down = s.currentHp<=0;
      const hpColor = hpPct>50?"#5cc47a":hpPct>25?"#f0b429":"#e05252";
      const picked = view.multiSel && view.multiSel.includes(s.id);
      const answered=lesson.active && lesson.answered && lesson.answered[s.id];
      const boss=state.boss,gb=boss&&boss.groupBuffs&&boss.groupBuffs[s.group]||{};
      const bossTags=[];
      if(boss){
        if(down) bossTags.push("💤 休整中");
        else if(boss.standby&&boss.standby[s.id]) bossTags.push("✓ 已行動");
        else if(s.group===nextAttackGroup()) bossTags.push("⚔️ 準備出手");
        else bossTags.push("⏳ 等待回合");
        if(gb.atk) bossTags.push("🔥 攻擊+"+Math.round(gb.atk*100)+"%");
        if(gb.def) bossTags.push("🛡 減傷+"+Math.round(gb.def*100)+"%");
      }
      return '<button class="member'+(down?" downed":"")+(picked?" msel":"")+(answered?" msel":"")+'" data-award="'+s.id+'" data-charwall="'+s.id+'">'
        + (picked?'<span class="msel-badge">✓</span>':'')
        + '<span class="member-doll"'+(down?' style="filter:grayscale(1) brightness(.6)"':'')+'>'+dollSVG(s, 180)+'</span>'
        + '<span class="mname"><span class="mlv-in num">Lv.'+s.level+'</span> '+esc(s.name)+(down?' 💀':'')+'</span>'
        + '<div class="member-hp" style="width:76%;min-width:72px;height:9px;background:#2a3350;border:1px solid rgba(0,0,0,.45);border-radius:5px;overflow:hidden;margin:3px auto 1px"><i style="display:block;height:100%;width:'+hpPct+'%;background:'+hpColor+'"></i></div>'
        + (boss?'<span class="mtitle" style="display:block;font-weight:900;color:'+(down?'#b83232':'#24324a')+'">HP '+Math.max(0,s.currentHp)+' / '+effMax+'</span><span class="mtitle" style="display:block;line-height:1.35">'+bossTags.join('・')+'</span>':(answered?'<span class="mtitle" style="color:#b8860b">✓ 已回答</span>':(lesson.active?'<span class="mtitle" style="color:#1f6fa8">💡 點此判定回答</span>':(bd?'<span class="mtitle">'+bd+'</span>':''))))+'</button>';
    }).join("") || '<div class="mini" style="grid-column:1/-1">尚無成員——到名冊管理加入學生</div>';
    return '<div class="group-card" data-member-count="'+members.length+'">'
      + '<div class="group-head"><span class="gname">'+esc(gn)+' 組</span>'
      + '<span class="gscore num">'+groupScore(gn)+' XP</span><span class="hsp"></span>'
      + '<button class="gaward" data-gaward="'+esc(gn)+'">整組 +10 XP</button></div>'
      + '<div class="member-grid">'+mm+'</div></div>';
  }).join("");
  const hint=lesson.active ? '📣 '+esc(lesson.title||"知識挑戰")+'：點回答的角色發放 +'+(lesson.xp||0)+' XP' : '點學生角色即可快速加分';
  return '<div class="group-wall board-focus">'+walls+'</div>'
    + '<div class="board-quickbar"><span class="mini">'+hint+'</span>'
    + '<button class="btn'+(view.multiSel?" gold":"")+'" id="btnMulti">'+(view.multiSel?"☑ "+view.multiSel.length+" 人":"☑ 批次")+'</button>'
    + '<button class="btn'+(lesson.active?" gold":"")+'" id="btnLesson">'+(lesson.active?"🏁 結束答題":"📣 出題")+'</button>'
    + (CLOUD.on()?'<button class="btn" id="btnQr">📱 QR</button>':'')
    + (view.multiSel&&view.multiSel.length?'<button class="btn gold" id="btnMultiGo">發獎勵</button>':'')
    + '<button class="btn'+(view.locked?" gold":"")+'" id="btnLock">'+(view.locked?"🔒":"🔓")+'</button></div>'+courseBtn;
}
/* ── 浮動控制台:可拖曳,收合成圓鈕仍可拖 ── */
function floatConsole(toolbar){
  const pg = progCheck();
  const pct = Math.min(100, Math.round(pg.exploreXp/Math.max(1,pg.exploreGoal)*100));
  const stageTxt = pg.stage===0 ? "🗺 探索" : (pg.stage===1 ? "⚔️ 魔王" : "🏟 競技場");
  const b = state.boss;
  let bossCtl = "";
  if(b){
    if(!b.standby) b.standby = {};
    const ng = nextAttackGroup();
    const order = [...new Set(state.students.map(x=>x.group))]
      .filter(gr=>state.students.some(x=>x.group===gr))
      .sort((a,c)=>groupAvgAgi(c)-groupAvgAgi(a));
    const orderStr = order.map(gr=>{
      const done = !state.students.some(x=>x.group===gr && x.currentHp>0 && !b.standby[x.id]);
      return (gr===ng?'▶':'')+gr+(done?'✓':'');
    }).join(' → ');
    const bpct = Math.round(b.hp/b.maxHp*100);
    bossCtl = '<div class="fc-boss">'
      + '<div class="fc-bossbar"><span>🐉 '+esc(b.name)+'</span><span class="num">'+b.hp+'/'+b.maxHp+'</span></div>'
      + '<div class="goal-bar boss-bar" style="margin:4px 0"><i style="width:'+bpct+'%"></i></div>'
      + '<div style="font-size:12px;font-weight:700;margin:4px 0">出手:'+esc(orderStr||"—")+'</div>'
      + '<div class="fc-btns">'
      + '<button class="btn gold" id="bsGroupAtk"'+(ng?"":" disabled")+'>⚔️ '+(ng?ng+'組攻擊':'全部打完')+'</button>'
      + '<button class="btn" id="bsSkip"'+(ng?"":" disabled")+'>⏭ 跳過</button>'
      + '<button class="btn danger" data-bscounter="1">🐉 反擊</button>'
      + '<button class="btn" id="bsRestBoard">💤 休息</button></div></div>';
  }
  return '<div id="float-console" class="fc-open">'
    + '<div class="fc-bar" id="fcDrag"><span class="fc-title">🎮 老師控制台</span>'
    + '<button class="fc-min" id="fcMin" title="收合">—</button></div>'
    + '<div class="fc-body">'
    + '<div class="fc-goal">'+stageTxt+' <b class="num">'+(pg.stage===0 ? pg.exploreXp+'/'+pg.exploreGoal+'('+pct+'%)' : (pg.stage===1?'討伐中':'已開放'))+'</b>'
    + (pg.stage===0 ? '<button class="btn" id="goalEdit" style="margin-left:6px;padding:2px 10px">設定</button>' : '')+'</div>'
    + bossCtl
    + '<div class="fc-btns" style="margin-top:8px">'
    + '<button class="btn'+(view.locked?" gold":"")+'" id="btnLock">'+(view.locked?"🔒 投影中":"🔓 投影模式")+'</button>'
    + '<button class="btn'+(view.multiSel?" gold":"")+'" id="btnMulti">'+(view.multiSel?"☑ 已選 "+view.multiSel.length+" 人(點角色勾選)":"☑ 批次加分")+'</button>'
    + '<button class="btn'+(state.lesson&&state.lesson.active?" gold":"")+'" id="btnLesson">'+(state.lesson&&state.lesson.active?"🏁 結束答題":"📣 發起答題")+'</button>'
    + (CLOUD.on() ? '<button class="btn" id="btnQr">📱 登入 QR</button>' : "")
    + (view.multiSel && view.multiSel.length ? '<button class="btn gold" id="btnMultiGo">💰 發獎勵給 '+view.multiSel.length+' 人</button>' : "")
    + (pendingSubs().length?'<span class="stat-chip">📌 待審 '+pendingSubs().length+'</span>':"")
    + '</div></div>'
    + '<button id="fcBubble" class="fc-bubble" title="展開控制台">🎮</button>'
    + '</div>';
}
/* ── 平時成績結算(#7):XP快照差值 → 線性換算 → CSV ── */
function gradeCalc(){
  const ti = state.termInfo;
  return state.students.map(st=>{
    const earned = Math.max(0, (st.totalXp||0) - (st.termStartXp||0));
    const raw = ti.minScore + (earned / Math.max(1, ti.target)) * (ti.maxScore - ti.minScore);
    const score = Math.round(Math.min(ti.maxScore, Math.max(ti.minScore, raw)));
    return { sno: st.sno||st.seat||"", name: st.name, earned, score };
  }).sort((a,b)=> (parseInt(a.sno)||999) - (parseInt(b.sno)||999));
}
function gradePanelHtml(){
  const ti = state.termInfo || { startDate:"", target:500, minScore:60, maxScore:100 };
  const rows = view.gradePreview ? gradeCalc().map(r=>
    '<tr><td class="num">'+esc(String(r.sno))+'</td><td>'+esc(r.name)+'</td><td class="num">'+r.earned+'</td><td class="num" style="font-weight:900">'+r.score+'</td></tr>').join("") : "";
  return '<div class="panel"><h3>📊 平時成績結算</h3>'
    + '<div class="mini" style="margin-bottom:8px">結算「計分週期」內獲得的 XP,線性換算成平時成績。'
    + (ti.startDate ? '目前週期自 <b>'+esc(ti.startDate)+'</b> 開始。' : '<b style="color:#c0392b">尚未開始週期(將以開班至今全部 XP 計算)。</b>')
    + '</div>'
    + '<div class="inline-form" style="margin-bottom:8px">'
    + '<button class="btn" id="gTermStart">🔄 開始新計分週期</button>'
    + '<label class="mini">滿分所需XP <input type="number" id="gTarget" value="'+ti.target+'" min="50" style="width:70px"></label>'
    + '<label class="mini">最低 <input type="number" id="gMin" value="'+ti.minScore+'" min="0" max="100" style="width:56px"></label>'
    + '<label class="mini">最高 <input type="number" id="gMax" value="'+ti.maxScore+'" min="0" max="100" style="width:56px"></label>'
    + '<button class="btn gold" id="gPreview">計算預覽</button>'
    + (view.gradePreview ? '<button class="btn gold" id="gCsv">⬇ 匯出 CSV</button>' : "")
    + '</div>'
    + (view.gradePreview ? '<div style="max-height:40vh;overflow:auto"><table><thead><tr><th>座號</th><th>姓名</th><th>週期XP</th><th>平時成績</th></tr></thead><tbody>'+rows+'</tbody></table></div>' : "")
    + '</div>';
}
function gradeCsvDownload(){
  const rows = gradeCalc();
  const csv = "\uFEFF座號,姓名,週期獲得XP,平時成績\n"
    + rows.map(r=> r.sno+","+r.name.replace(/,/g,"、")+","+r.earned+","+r.score).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "平時成績_"+new Date().toISOString().slice(0,10)+".csv";
  document.body.appendChild(a); a.click(); a.remove();
  toast("已匯出 "+rows.length+" 筆成績");
}
function rosterCell(value){
  return String(value==null?"":value).replace(/^\uFEFF/,"").trim();
}
function rosterHeaderKey(value){
  const v=rosterCell(value).toLowerCase().replace(/[\s_\-()（）：:必填選填]/g,"");
  if(/^(學號|studentid|studentno|sno)/.test(v))return "sno";
  if(/^(座號|seat|seatno)/.test(v))return "seat";
  if(/^(姓名|名字|name|studentname)/.test(v))return "name";
  if(/^(信箱|電子郵件|email|mail)/.test(v))return "email";
  if(/^(生日|出生日期|birth|birthday)/.test(v))return "birth";
  if(/^(分組|組別|group|team)/.test(v))return "group";
  return "";
}
function rosterBirth(value){
  const raw=rosterCell(value);
  if(!raw)return "";
  const digits=raw.replace(/[^0-9]/g,"");
  return digits.length===8?digits:raw;
}
function rosterBirthValid(value){
  if(!/^\d{8}$/.test(value))return false;
  const y=+value.slice(0,4),m=+value.slice(4,6),d=+value.slice(6,8),date=new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}
function parseStudentRosterRows(inputRows,requireHeader){
  const rows=(inputRows||[]).map(r=>Array.isArray(r)?r:[r]);
  let headerRow=-1,headers={};
  for(let i=0;i<Math.min(rows.length,20);i++){
    const found={};rows[i].forEach((v,j)=>{const k=rosterHeaderKey(v);if(k&&found[k]==null)found[k]=j;});
    if(found.sno!=null&&found.seat!=null&&found.name!=null){headerRow=i;headers=found;break;}
  }
  const errors=[],parsed=[],existSno=new Set(state.students.map(x=>rosterCell(x.sno)).filter(Boolean));
  const existSeat=new Set(state.students.map(x=>rosterCell(x.seat||x.sno)).filter(Boolean)),seenSno=new Set(),seenSeat=new Set();
  if(headerRow<0&&requireHeader){
    errors.push("找不到欄位標題。第一張工作表必須包含：學號、座號、姓名。");
    return {parsed,errors,headerRow,missingGroups:[]};
  }
  const start=headerRow>=0?headerRow+1:0;
  for(let i=start;i<rows.length;i++){
    const cols=rows[i].map(rosterCell);if(!cols.some(Boolean))continue;
    let sno="",seat="",name="",email="",birth="",group=UNASSIGNED_GROUP;
    if(headerRow>=0){
      const get=k=>headers[k]==null?"":rosterCell(cols[headers[k]]);
      sno=get("sno");seat=get("seat");name=get("name");email=get("email").toLowerCase();birth=rosterBirth(get("birth"));
    }else if(cols.length>=4){
      sno=cols[0];seat=cols[1];name=cols[2];email=(cols[3]||"").toLowerCase();birth=rosterBirth(cols[4]);
    }else{
      seat=cols[0]||"";sno=seat;name=cols[1]||"";email=(cols[2]||"").toLowerCase();
    }
    const rowNo=i+1,label="第 "+rowNo+" 列";
    if(!sno){errors.push(label+"：缺少學號");continue;}
    if(!seat){errors.push(label+"：缺少座號");continue;}
    if(!name){errors.push(label+"：缺少姓名");continue;}
    if(existSno.has(sno)||seenSno.has(sno)){errors.push(label+"：學號 "+sno+" 已重複（"+name+"）");continue;}
    if(existSeat.has(seat)||seenSeat.has(seat)){errors.push(label+"：座號 "+seat+" 已重複（"+name+"）");continue;}
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){errors.push(label+"：信箱格式錯誤（"+email+"）");continue;}
    if(birth&&!rosterBirthValid(birth)){errors.push(label+"：生日需為有效的 8 碼日期（例如 20130215）");continue;}
    seenSno.add(sno);seenSeat.add(seat);parsed.push({sno,seat,name,email,birth,group,rowNo});
  }
  return {parsed,errors,headerRow,missingGroups:state.groups.includes(UNASSIGNED_GROUP)?[]:[UNASSIGNED_GROUP]};
}
async function commitStudentRosterImport(result){
  const parsed=result.parsed||[];if(!parsed.length)return;
  (result.missingGroups||[]).forEach(g=>{if(g&&!state.groups.includes(g))state.groups.push(g);});
  parsed.forEach(pd=>{
    const id="S"+String(state.nextIdNum++).padStart(2,"0"),ns=newStudent(id,pd.name,"Warrior",UNASSIGNED_GROUP);
    ns.sno=pd.sno;ns.seat=pd.seat;ns.email="";if(pd.email)ns.registrationEmail=pd.email;if(pd.birth)ns.birth=pd.birth;
    state.students.push(ns);addLog(id,"由教師匯入名冊，加入公會！");
  });
  save();modalHost.innerHTML="";render();toast("成功匯入 "+parsed.length+" 位學生，正在同步班級名冊");
  if(CLOUD.on()){
    try{
      await CLOUD.pushDirty();
      await Promise.all([CLOUD.syncPublicRoster(true),CLOUD.syncEnrollments(true),CLOUD.syncParentViews(true)]);
      toast("☁️ "+parsed.length+" 位學生名冊已同步，可開始註冊");
    }catch(e){toast("名冊已保存在本機；雲端同步失敗，系統稍後會重試："+(e.message||e),true);}
  }
}
function openStudentRosterPreview(result,sourceLabel){
  const rows=result.parsed||[],errors=result.errors||[],newGroups=result.missingGroups||[];
  const tableRows=rows.slice(0,80).map(x=>'<tr><td class="num">'+esc(x.seat)+'</td><td>'+esc(x.sno)+'</td><td><b>'+esc(x.name)+'</b></td><td>'+esc(x.group)+'</td><td>'+esc(x.email||"—")+'</td></tr>').join("");
  const errorHtml=errors.length?'<div style="margin-top:10px;padding:10px;background:#fff1f0;border:2px solid #d33;border-radius:10px;color:#8b1a1a"><b>⚠️ 將跳過 '+errors.length+' 筆</b><div class="mini" style="max-height:130px;overflow:auto;margin-top:5px">'+errors.slice(0,30).map(esc).join("<br>")+(errors.length>30?'<br>…另有 '+(errors.length-30)+' 筆':'')+'</div></div>':'';
  modalHost.innerHTML='<div class="overlay" id="rosterPreviewOverlay"><div class="modal" style="max-width:900px;width:min(94vw,900px)"><h3 style="margin-top:0">📋 匯入學生名冊前確認</h3>'
    +'<div class="mini">來源：<b>'+esc(sourceLabel||"名冊")+'</b>・可匯入 <b style="color:#16794b">'+rows.length+'</b> 位・跳過 <b style="color:#b42318">'+errors.length+'</b> 筆</div>'
    +(newGroups.length?'<div class="mini" style="margin-top:6px;color:#8a5b00">匯入時會自動新增組別：<b>'+newGroups.map(esc).join("、")+'</b></div>':'')
    +(rows.length?'<div style="max-height:48vh;overflow:auto;margin-top:10px"><table><thead><tr><th>座號</th><th>學號</th><th>姓名</th><th>組別</th><th>信箱</th></tr></thead><tbody>'+tableRows+'</tbody></table></div>':'<div class="panel" style="margin-top:10px;color:#b42318">沒有可匯入的學生資料。</div>')
    +errorHtml+'<div class="inline-form" style="justify-content:flex-end;margin-top:14px"><button class="btn" id="rosterPreviewCancel">返回修改</button><button class="btn gold" id="rosterPreviewConfirm"'+(rows.length?'':' disabled')+'>確認匯入 '+rows.length+' 位</button></div></div></div>';
  const close=()=>{modalHost.innerHTML="";};
  document.getElementById("rosterPreviewCancel").onclick=close;
  document.getElementById("rosterPreviewOverlay").onclick=e=>{if(e.target.id==="rosterPreviewOverlay")close();};
  const confirmBtn=document.getElementById("rosterPreviewConfirm");
  if(confirmBtn&&rows.length)confirmBtn.onclick=()=>{confirmBtn.disabled=true;commitStudentRosterImport(result);};
}
async function previewStudentRosterFile(file){
  if(!file)return;
  if(file.size>5*1024*1024){toast("名冊檔案超過 5MB，請刪除不必要的圖片或工作表",true);return;}
  if(!window.XLSX){toast("Excel 讀取元件尚未載入，請確認網路後重試；也可先使用貼上名冊",true);return;}
  try{
    const buffer=await file.arrayBuffer(),book=XLSX.read(buffer,{type:"array",cellDates:false});
    if(!book.SheetNames.length)throw new Error("檔案沒有工作表");
    const sheet=book.Sheets[book.SheetNames[0]],rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:false});
    openStudentRosterPreview(parseStudentRosterRows(rows,true),file.name+"／"+book.SheetNames[0]);
  }catch(e){toast("無法讀取名冊："+(e.message||e),true);}
}
function teacherRoster(){
  const rosterGroups=Array.from(new Set([UNASSIGNED_GROUP].concat(state.groups||[])));
  const gOpts = rosterGroups.map(g=>'<option value="'+esc(g)+'">'+esc(g)+'</option>').join("");
  const rows = state.students.map(s=>{
    const gSel = rosterGroups.map(g=>'<option value="'+esc(g)+'" '+(s.group===g?"selected":"")+'>'+esc(g)+'</option>').join("");
    const rosterEmail=String(s.email||s.registrationEmail||"");
    return '<tr><td>'+dollSVG(s,34)+'</td>'
      + '<td><b>'+esc(s.name)+'</b><div class="mini num">'+esc(jobNameOf(s))+'</div>'
      + '<div class="mini">學號<input type="text" data-sno="'+s.id+'" value="'+esc(String(s.sno||""))+'" placeholder="唯一" style="width:70px;padding:2px 4px"> 座<input type="text" data-seat="'+s.id+'" value="'+esc(String(s.seat||""))+'" style="width:40px;padding:2px 4px"> '
      + '生日<input type="text" data-birth="'+s.id+'" value="'+esc(String(s.birth||""))+'" placeholder="20130215" style="width:90px;padding:2px 4px"></div>'
      + '<div class="mini">📧<input type="text" data-email="'+s.id+'" value="'+esc(rosterEmail)+'" placeholder="學生Google信箱" style="width:150px;padding:2px 4px">'
      + (rosterEmail.trim()
          ? (s.registrationComplete===true?' <span class="tag" style="background:#3a7;font-size:10px">已完成註冊</span>':' <span class="tag" style="background:#d58a16;font-size:10px">待完成選角</span>')+' <button class="btn" data-rosterbind="'+s.id+'" style="padding:0 8px;font-size:11px" title="將姓名、學號、座號與信箱同步到註冊索引">同步綁定</button> <button class="btn danger" data-unbind="'+s.id+'" style="padding:0 8px;font-size:11px" title="清空信箱,讓學生重新認領">解綁</button>'
          : ' <span class="tag" style="background:#999;font-size:10px">待認領</span>')
      + '</div></td>'
      + '<td class="num">Lv.'+s.level+'<div class="mini num">'+s.gold+' 金・SP '+s.spPoints+'</div></td>'
      + '<td><select data-gchange="'+s.id+'">'+gSel+'</select>'
      + '<select data-mentor="'+s.id+'" title="組員獲得 XP 時，組長收到的指導金幣倍率" style="margin-top:4px">'
      + [[1,"💰×1 標準"],[2,"💰×2 加倍"],[3,"💰×3 三倍"]].map(m=>'<option value="'+m[0]+'"'+((s.mentorTier||1)===m[0]?" selected":"")+'>'+m[1]+'</option>').join("")
      + '</select></td>'
      + '<td><button class="btn" data-skreset="'+s.id+'" title="退還此生SP">洗技</button> <button class="btn danger" data-del="'+s.id+'">移除</button></td></tr>';
  }).join("");
  const twl = (state.teacherEmails||[]).map((em,i)=>
    '<div class="group-manage-row"><span class="gm-name" style="font-size:13px">'+esc(em)+'</span>'
    + '<button class="btn danger gm-del" data-tdel="'+i+'">✕ 移除</button></div>').join("")
    || '<div class="mini">尚無教師。第一位以「教師登入」的 Google 帳號會自動登記。</div>';
  const lastBk = (()=>{ try{ return localStorage.getItem("rpg-last-backup"); }catch(_){ return null; } })();
  const bkDays = lastBk ? Math.floor((Date.now()-new Date(lastBk).getTime())/86400000) : null;
  const bkNote = lastBk
    ? '上次備份:'+new Date(lastBk).toLocaleString("zh-TW",{hour12:false})+(bkDays>=7?' <b style="color:#c0392b">(已超過 '+bkDays+' 天,建議再備份一次)</b>':(bkDays>=1?'('+bkDays+' 天前)':'(今天)'))
    : '<b style="color:#c0392b">還沒有備份過——強烈建議先匯出一份!</b>';
  // 💽 儲存空間用量(localStorage 約 5MB;圖片作品是主要佔用者,像素作品極小)
  const stateSize = (()=>{ try{ return JSON.stringify(state).length; }catch(_){ return 0; } })();
  const imgItems = (state.customItems||[]).filter(it=>it.img).map(it=>({name:it.name, kb:Math.round((it.img||"").length*3/4/1024)})).sort((a,b)=>b.kb-a.kb);
  const imgTotalKb = imgItems.reduce((a,x)=>a+x.kb,0);
  const usedMb = (stateSize/1048576).toFixed(2);
  const pct = Math.min(100, Math.round(stateSize/5242880*100));
  const barColor = pct>=80 ? "#c0392b" : (pct>=50 ? "#e2a500" : "#3fae76");
  const spaceHtml = '<div class="mini" style="margin:10px 0 4px"><b>💽 本機儲存空間</b>:'+usedMb+' MB / 約 5 MB('+pct+'%)'
    + (imgItems.length ? '・圖片作品 '+imgItems.length+' 件共 '+imgTotalKb+' KB' : '')
    + '</div>'
    + '<div style="height:8px;background:#eee;border:1px solid #ccc;border-radius:5px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+barColor+'"></div></div>'
    + (pct>=80 ? '<div class="mini" style="color:#c0392b;margin-top:4px">⚠️ 空間快滿!建議先匯出備份,再刪除最大的圖片作品'+(imgItems[0]?'(最大:'+esc(imgItems[0].name)+' '+imgItems[0].kb+'KB)':'')+'。</div>' : '');
  const rosterSection=view.rosterSection||"import",showSection=k=>rosterSection===k?"":"display:none;";
  const rosterNav='<div class="panel" style="position:sticky;top:8px;z-index:12;padding:10px;background:#fff8df"><h3 style="margin:0 0 8px">📋 名冊管理</h3><div class="inline-form" style="gap:7px">'
    +[['import','📥 匯入名冊'],['students','👥 學生資料'],['groups','🧩 分組設定'],['grades','📊 成績結算'],['class','🏫 班級設定'],['backup','💾 備份工具']].map(x=>'<button class="btn'+(rosterSection===x[0]?' gold':'')+'" data-roster-section="'+x[0]+'">'+x[1]+'</button>').join('')+'</div></div>';
  const rosterImport='<div class="panel" style="'+showSection('import')+'"><h3>📥 匯入學生名冊</h3><p class="mini">依照三個步驟完成；系統一定會先顯示檢核預覽，按下確認前不會寫入學生資料。</p>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:10px 0">'
    + '<div class="panel" style="margin:0;padding:12px;background:#fff8db"><b>1　下載 Excel 範例</b><div class="mini" style="margin:5px 0 10px">必填學號、座號、姓名；範例資料放在第二張工作表。</div><a class="btn gold" href="'+STUDENT_ROSTER_TEMPLATE_URL+'" download>⬇️ 下載學生名冊範本</a></div>'
    + '<div class="panel" style="margin:0;padding:12px;background:#eef8ff"><b>2　選擇名冊檔案</b><div class="mini" style="margin:5px 0 10px">支援 .xlsx、.xls、.csv，讀取第一張工作表。</div><label class="btn gold" style="display:inline-block">📤 匯入 Excel／CSV<input id="studentRosterFile" type="file" accept=".xlsx,.xls,.csv" style="display:none"></label></div>'
    + '<div class="panel" style="margin:0;padding:12px;background:#f0fff4"><b>3　新生預設狀態</b><div class="mini" style="margin:5px 0">所有新生先進入：</div><div class="tag" style="font-size:15px">'+UNASSIGNED_GROUP+'</div><div class="mini" style="margin-top:6px">職業由學生完成註冊時選定，教師名冊不預先指定。</div></div></div>'
    + '<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:800">也可從 Excel 複製後貼上</summary><div class="mini" style="margin:8px 0">每行一位學生，用逗號或 Tab 分隔。欄位：學號、座號、姓名、信箱、生日。</div>'
    + '<textarea id="bulkText" rows="6" style="width:100%;font-family:monospace;font-size:13px;padding:8px" placeholder="學號,座號,姓名,信箱&#10;1120345,15,王小明,ming@mail.edu.tw&#10;1120346,16,李小華,hua@mail.edu.tw"></textarea><div class="inline-form" style="margin-top:8px"><button class="btn gold" id="bulkImport">檢核並預覽貼上資料</button></div></details>'
    + '<div class="mini" style="margin-top:8px">會檢查缺漏、重複學號／座號、信箱與生日；匯入後一律為「無組別、待選職業」。</div></div>';
  return rosterNav+rosterImport+'<div class="panel" style="'+showSection('backup')+'"><h3>💾 本班完整資料備份</h3>'
    + '<div style="padding:9px 11px;margin-bottom:9px;border:2px solid #3a7;border-radius:9px;background:#effff4"><b>目前備份班級：'+esc(state.className||state.lbName||'班級')+(CLOUD.cid?'（代碼 '+esc(CLOUD.cid)+'）':'（本機模式）')+'</b><div class="mini" style="margin-top:4px">共 '+(state.students||[]).length+' 名學生。每位角色的職業、等級、XP、能力、技能、裝備、背包、寵物、貨幣與學習紀錄都會完整保存。</div></div>'
    + '<div class="mini" style="margin-bottom:8px">'+bkNote+'</div>'
    + spaceHtml
    + '<div class="inline-form">'
    + '<button class="btn gold" id="btnExport">⬇ 匯出本班完整角色備份</button>'
    + '<label class="btn" style="display:inline-block">⬆ 還原至目前班級<input type="file" id="fileImport" accept=".json,application/json" style="display:none"></label>'
    + '</div>'
    + '<label class="mini" style="display:block;margin-top:8px"><input type="checkbox" id="bkRemind"'+(state.backupReminder?" checked":"")+'> 每週五(及超過 7 天沒備份時)登入後提醒我備份</label>'
    + '<div class="mini" style="margin-top:8px;line-height:1.7">・<b>班級隔離</b>：新版備份記錄班級代碼，不能誤匯入另一班。<br>・<b>完整性</b>：匯入前檢查檔案雜湊、學生數與重複 ID。<br>・<b>雲端核對</b>：'+(CLOUD.on()?'還原後會重新讀取雲端，逐筆比對學生角色、公開名冊、作品與任務回報；全部一致才顯示完成。':'目前是本機模式，匯入後保存在這台裝置。')+'<br>・備份檔可跨裝置保存，但必須先登入並選取原本的班級才能還原。</div></div>'
    + '<div class="panel" style="'+showSection('class')+'"><h3>技能樹設定</h3>'
    + '<div class="inline-form"><button class="btn'+(skillsEnabled()?" gold":"")+'" id="btnSkillToggle">技能樹:'+(skillsEnabled()?"開啟中":"已關閉")+'</button>'
    + '<button class="btn danger" id="btnSkillResetAll">全班洗技(退還所有 SP)</button></div>'
    + '<div class="mini" style="margin-top:6px">關閉後隱藏學生技能樹分頁、所有觸發與加成失效,但 SP 會保留。</div></div>'
    + (CLOUD.cid?'<div class="panel" style="'+showSection('class')+'background:linear-gradient(135deg,#fff8df,#ffe8a4);color:#141414;border:3px solid #141414"><h3 style="color:#141414">🏫 班級註冊資料</h3><div class="inline-form"><span>班級代碼 <b class="num" style="font-size:22px;letter-spacing:2px">'+esc(CLOUD.cid)+'</b></span><button class="btn gold" id="copyClassCode">📋 複製代碼</button><button class="btn" id="openClassQrBtn">📱 本節課登入 QR</button></div><div class="mini" style="margin-top:6px;color:#665128">新生第一次註冊才需核對班級代碼、學號與座號；掃課堂 QR 時班級代碼會自動帶入。已註冊學生掃碼後直接使用原 Google 帳號登入。</div></div>':'')
    + '<div class="panel" style="'+showSection('students')+'"><h3>學生名冊<span class="hsp"></span>'
    + '<button class="btn danger" id="btnWipe">全部重置</button></h3>'
    + '<table><thead><tr><th></th><th>姓名</th><th>等級</th><th>分組</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>'
    + '<div class="inline-form" style="margin-top:12px">'
    + '<input type="text" id="nsName" placeholder="新學生姓名" style="width:130px">'
    + '<input type="text" id="nsSno" placeholder="學號" style="width:90px">'
    + '<input type="text" id="nsSeat" placeholder="座號" style="width:65px">'
    + '<input type="email" id="nsEmail" placeholder="Google 信箱（必填）" style="width:190px">'
    + '<input type="text" id="nsBirth" maxlength="8" inputmode="numeric" placeholder="生日 20130215（選填）" style="width:155px">'
    + '<span class="tag">'+UNASSIGNED_GROUP+'・待選職業</span>'
    + '<button class="btn gold" id="nsAdd">建立名冊並預先綁定</button></div>'
    + '<div class="mini" style="margin-top:7px;line-height:1.7">教師輸入的 Google 信箱會成為這筆名冊唯一可認領的帳號。學生仍須掃描本節課 QR、使用同一信箱登入，並在最後確認畫面完成素體與職業選擇。</div>'
    + '</div>'
    + '<div style="'+showSection('grades')+'">'+gradePanelHtml()+'</div>'
    + '<div class="panel" style="'+showSection('groups')+'"><h3>分組</h3>'
    + '<div class="group-manage-list">'
    + state.groups.map(g=>{
        const members = state.students.filter(s=>s.group===g);
        const lid = state.groupLeaders[g] || "";
        const lSel = '<select data-gleader="'+esc(g)+'"><option value="">— 組長 —</option>'
          + members.map(m=>'<option value="'+m.id+'"'+(m.id===lid?" selected":"")+'>👑 '+esc(m.name)+'</option>').join("")+'</select>';
        return '<div class="group-manage-row">'
        + '<span class="gm-name">'+esc(g)+' 組('+members.length+' 人)</span>'
        + lSel
        + '<button class="btn danger gm-del" data-gdel="'+esc(g)+'">✕ 刪除</button></div>';
      }).join("")
    + '</div>'
    + '<div class="inline-form" style="margin-top:10px">'
    + '<input type="text" id="ngName" placeholder="新組名" style="width:120px">'
    + '<button class="btn" id="ngAdd">新增組別</button></div>'
    + '<div class="mini" style="margin-top:8px">刪除組別時,組內學生會移到第一個組。</div></div>'
    + '<div class="panel" style="'+showSection('class')+'"><h3>👩‍🏫 教師白名單(Google 登入)</h3>'
    + '<div class="group-manage-list">'+twl+'</div>'
    + '<div class="inline-form" style="margin-top:10px">'
    + '<input type="text" id="twAdd" placeholder="新增教師 Gmail" style="width:200px">'
    + '<button class="btn" id="twAddBtn">加入白名單</button></div>'
    + '<div class="mini" style="margin-top:6px">學生登入:在上方名冊填入學生的 Google 信箱。家長查看:填學號+生日(8碼),記得幫每位學生填學號。</div></div>'
    + (CLOUD.on() ? '<div class="panel" style="'+showSection('class')+'"><h3>🔗 班級連結與跨班世界系統</h3>'
      + '<div class="inline-form"><input type="text" id="classLink" readonly value="'+esc(location.origin+location.pathname+"?class="+CLOUD.cid)+'" style="flex:1;font-size:12px">'
      + '<button class="btn gold" id="copyLink">複製連結</button></div>'
      + '<div class="mini" style="margin:4px 0 10px">把連結發到班群,學生/家長點開即可登入本班。</div>'
      + (classFeatureUnlocked("world")?'<div class="inline-form"><button class="btn'+(state.lbOptIn?" gold":"")+'" id="lbToggle">世界排行榜:'+(state.lbOptIn?"參加中":"未參加")+'</button>'
      + '<input type="text" id="lbName" placeholder="上榜暱稱(例:桃園某國中703)" value="'+esc(state.lbName||"")+'" style="flex:1">'
      + '<button class="btn" id="lbView">🌍 看排行榜</button></div>'
      + '<div class="mini" style="margin-top:4px">只上傳班級摘要(人均XP/週XP/團隊試煉次數),不會公開任何學生姓名。</div>':'<div class="unlock-note">'+classFeatureLockText("world")+'。請到「解鎖進度」個別開啟；班級連結仍可正常使用。</div>')+'</div>' : "");
}
function teacherTasks(){
  const scopeOpts = ['<option value="all">全班</option>'].concat(
    state.groups.map(g=>'<option value="'+esc(g)+'">'+esc(g)+' 組</option>')).join("")
    + '<option value="pick">🎯 指定學生(可勾多人,專屬任務)</option>';
  const groupPickBtns=state.groups.map(g=>'<button type="button" class="btn" data-tpickgroup="'+esc(g)+'" style="padding:3px 8px;font-size:11px">'+esc(g)+' 組</button>').join("");
  const pickBoxes = state.students.map(x=>
    '<label class="task-picker-person"><input type="checkbox" class="tkPick" data-group="'+esc(x.group)+'" value="'+x.id+'"><span>'+esc(x.name)+'</span><span class="mini">'+esc(x.group)+'組</span></label>').join("");
  const dungeonRows=lessonQuestionBank();
  const dungeonBankBoxes=dungeonRows.map((r,i)=>'<label class="dungeon-bank-option" data-dungeon-vol="'+esc(r.vol)+'" data-dungeon-grade="'+esc(r.grade||'')+'"><input type="checkbox" class="tkDungeonBank" value="'+i+'"><span><b>'+esc((r.grade||"")+"・第 "+(r.vol||"?")+" 冊｜"+(r.unit||r.chap||"未分類"))+'</b><small>'+esc(r.topic||"主題")+'・'+((r.qs||[]).length)+' 題'+(r.custom?'・教師追加題庫':'・課程目錄題庫')+'</small></span></label>').join("");
  const dungeonQuick='<div class="task-form-grid"><label class="wide">作業名稱<input id="dungeonTaskTitle" value="地下城自主複習" maxlength="40"></label><label>課本冊別<select id="dungeonTaskVolume">'+[1,2,3,4,5,6].map(v=>'<option value="'+v+'">第 '+v+' 冊（'+(v<=2?'七年級':v<=4?'八年級':'九年級')+'）</option>').join("")+'</select></label><label>發布對象<select id="dungeonTaskScope">'+scopeOpts.replace('<option value="pick">🎯 指定學生(可勾多人,專屬任務)</option>',"")+'</select></label><label>完成門檻<input id="dungeonTaskTarget" type="number" min="3" max="100" value="10"> 題</label><label>任務 XP<input id="dungeonTaskXp" type="number" min="0" max="500" value="20"></label><label>任務金幣<input id="dungeonTaskGold" type="number" min="0" max="1000" value="10"></label></div>'
    +'<details style="margin-top:9px"><summary><b>☑️ 勾選課程目錄的題庫單元</b> <span class="mini" id="dungeonBankCount">未勾選時使用地下城內建題庫</span></summary><div class="inline-form" style="margin-top:8px"><button type="button" class="btn" id="dungeonBankAll">勾選本冊全部</button><button type="button" class="btn" id="dungeonBankNone">清除勾選</button></div><div class="dungeon-bank-picker">'+(dungeonBankBoxes||'<div class="mini">目前沒有課程目錄題庫，仍可發布地下城內建題庫作業。</div>')+'</div></details>'
    +'<div class="dungeon-reward-note" style="margin-top:9px">學生遊玩會取得每日限額自主獎勵；達標或通關時成果會自動送入教師審核，教師通過後才發正式任務獎勵。勾選後會混合「課程目錄題目＋地下城同單元題型」，並鎖定同年級、同冊別與同單元，不會跨單元出題。</div><div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn gold" id="dungeonTaskPublish">🏰 發布地下城作業</button></div>';
  const pend = pendingSubs().map(x=>{
    const s = stu(x.sid); const t = taskById(x.taskId);
    if(!s || !t) return "";
    const rw=taskReward(t,x.tier||0);
    const ri=taskReviewInfo(t), elapsed=Math.max(0,Date.now()-submissionTime(x));
    const waitHours=Math.max(0,Number(t.leaderDelayHours)||0), left=Math.max(0,Math.ceil((waitHours*3600000-elapsed)/3600000));
    const reviewHint=taskReviewMode(t)==="leader" ? (left?"約 "+left+" 小時後開放同組組長":"已開放同組組長代審") : ri.name;
    return '<article class="task-review-item"><input type="checkbox" class="task-review-check" value="'+t.id+'|'+s.id+'" aria-label="選取 '+esc(s.name)+' 的任務">'+dollSVG(s,38)+'<div class="task-review-main"><b>'+esc(s.name)+'・'+esc(t.title)+'</b>'
      + (t.tiers?' <span class="tag">'+TIER_ICONS[x.tier||0]+TIER_NAMES[x.tier||0]+'</span>':'')
      + ' <span class="review-mode-tag">'+ri.icon+ri.name+'</span><div class="mini num">回報 '+x.t+'・獎勵 +'+rw.xp+' XP／+'+rw.gold+' 金</div>'+(x.dungeonResult?'<div class="mini">🏰 答對 '+(Number(x.dungeonResult.correct)||0)+'／'+(Number(x.dungeonResult.questions)||0)+' 題・通關 '+(Number(x.dungeonResult.zoneClears)||0)+'・最高 '+(Number(x.dungeonResult.bestChain)||0)+' 連擊</div>':'')+'<div class="mini">'+reviewHint+'</div></div>'
      + '<div class="task-review-actions"><button class="btn gold" data-approve="'+t.id+'|'+s.id+'">✓ 通過</button><button class="btn danger" data-reject="'+t.id+'|'+s.id+'">↩ 退回</button></div></article>';
  }).join("") || '<div class="mini">目前沒有待審核的回報。</div>';
  const rows = state.tasks.map(t=>{
    const done = state.submissions.filter(x=>x.taskId===t.id && x.status==="approved").length;
    const cat = taskCategoryInfo(t);
    const ri=taskReviewInfo(t), autoInfo=TASK_AUTO_RULES[t.autoRule]||TASK_AUTO_RULES.level;
    const reviewExtra=taskReviewMode(t)==="auto" ? ("・"+autoInfo.name+"達 "+Math.max(1,Number(t.autoTarget)||1)+autoInfo.unit) : (taskReviewMode(t)==="leader"?"・"+Math.max(0,Number(t.leaderDelayHours)||0)+"小時後代審":"");
    const scopeText=t.scope==="all"?"全班":(t.scope&&t.scope.indexOf("stu:")===0?("🎯 專屬："+t.scope.slice(4).split(",").map(id=>(stu(id)||{name:"?"}).name).join("、")):t.scope+" 組");
    const rewardTags=t.tiers?t.tiers.map((r,i)=>'<span>'+TIER_ICONS[i]+TIER_NAMES[i]+' '+r.xp+'XP／'+r.gold+'金</span>').join(""):'<span>+'+t.xp+'XP／+'+t.gold+'金</span>';
    return '<article class="task-manage-item'+(t.active?'':' off')+'"><div class="task-manage-main"><b>'+cat.icon+' '+esc(t.title)+'</b> '+(t.tiers?'<span class="tag">差異化</span>':'')
      + ' <span class="review-mode-tag">'+ri.icon+ri.name+'</span><div class="mini">'+cat.name+'・'+esc(scopeText)+reviewExtra+'・已完成 '+done+' 人'+(t.active?'':'・已停用')+'</div><div class="task-reward-tags">'+rewardTags+'</div></div>'
      + '<div class="task-manage-actions"><button class="btn" data-ttoggle="'+t.id+'">'+(t.active?"暫停":"啟用")+'</button><button class="btn danger" data-taskdel="'+t.id+'">刪除</button></div></article>';
  }).join("") || '<div class="mini">還沒有任務——請展開「發布／差異化任務」建立第一個。</div>';
  const activeN=state.tasks.filter(t=>t.active).length,diffN=state.tasks.filter(t=>t.tiers&&t.tiers.length).length;
  const auditRows=(state.taskReviewLog||[]).slice(0,40).map(log=>{
    const author=stu(log.sid), reviewer=log.source==="auto"?{name:"系統"}:(log.source==="teacher"?{name:"教師"}:stu(log.reviewerId));
    const source=TASK_REVIEW_MODES[log.source]||TASK_REVIEW_MODES.teacher;
    return '<tr><td class="mini num">'+new Date(log.reviewedAt).toLocaleString("zh-TW",{hour12:false})+'</td><td>'+esc((author||{name:"?"}).name)+'</td><td>'+esc(log.taskTitle||("任務 "+log.taskId))+'</td><td>'+source.icon+esc((reviewer||{name:"?"}).name)+'</td><td>'+(log.decision==="approved"?'<span style="color:#16733a;font-weight:900">✓ 通過</span>':'<span style="color:#a83232;font-weight:900">↩ 退回</span>')+'</td></tr>';
  }).join("")||'<tr><td colspan="5" class="mini">還沒有任務審核紀錄。</td></tr>';
  const createBody='<div class="task-form-grid">'
    + '<label class="wide">任務名稱<input type="text" id="tkTitle" placeholder="例：完成一次因式分解訂正"></label>'
    + '<label>學習類型<select id="tkCategory">'+Object.keys(TASK_CATEGORIES).map(k=>'<option value="'+k+'">'+TASK_CATEGORIES[k].icon+' '+TASK_CATEGORIES[k].name+'</option>').join("")+'</select></label>'
    + '<label>發布對象<select id="tkScope">'+scopeOpts+'</select></label>'
    + '<label>任務模式<select id="tkTier"><option value="single">單一難度</option><option value="tiered">🟢🟡🔴 三層差異化</option></select></label>'
    + '<label>審核方式<select id="tkReviewMode"><option value="teacher">👩‍🏫 教師手動審核</option><option value="auto">⚙️ 系統自動驗證</option><option value="leader">🛡️ 隔日交給同組組長</option></select></label>'
    + '<label>通過後稱號（選填）<input type="text" id="tkTitleReward" placeholder="例：因式分解達人"></label>'
    + '<div class="task-review-config" id="taskAutoConfig" style="display:none"><label>自動驗證條件<select id="tkAutoRule">'+Object.keys(TASK_AUTO_RULES).map(k=>'<option value="'+k+'">'+TASK_AUTO_RULES[k].name+'</option>').join("")+'</select></label><label>達標門檻<input type="number" id="tkAutoTarget" min="1" value="1"></label><div class="mini">學生按回報時，由系統讀取角色紀錄；未達門檻不能領取，達標立即發獎勵。</div></div>'
    + '<div class="task-review-config" id="taskLeaderConfig" style="display:none"><label>多久後開放組長代審<select id="tkLeaderDelay"><option value="24" selected>隔日（24 小時）</option><option value="12">12 小時</option><option value="6">6 小時</option><option value="48">48 小時</option></select></label><div class="mini">教師仍可隨時先審；系統每天隨機排列同組案件，組長不能審自己，必須逐項勾選固定量表。累積 '+peerReviewDiamondEvery()+' 件才獲得 1💎，每週最多 '+peerReviewWeeklyGemMax()+'💎。</div></div></div>'
    + '<div class="task-section-title">🎁 設定分層獎勵</div><div class="task-reward-grid"><div class="task-tier-card"><b>🟢 基礎層</b><div class="mini">核心必做，適合建立成功經驗</div><div class="task-tier-inputs"><label>XP<input type="number" id="tkXp" min="0" value="20"></label><label>金幣<input type="number" id="tkGold" min="0" value="30"></label></div></div>'
    + '<div class="task-tier-more" id="tierRow" style="display:none"><div class="task-tier-card advanced"><b>🟡 進階層</b><div class="mini">增加步驟、題數或解釋</div><div class="task-tier-inputs"><label>XP<input type="number" id="tkXp2" min="0" value="40"></label><label>金幣<input type="number" id="tkGold2" min="0" value="60"></label></div></div><div class="task-tier-card challenge"><b>🔴 挑戰層</b><div class="mini">延伸應用或高難度挑戰</div><div class="task-tier-inputs"><label>XP<input type="number" id="tkXp3" min="0" value="60"></label><label>金幣<input type="number" id="tkGold3" min="0" value="90"></label></div></div></div></div>'
    + '<div class="task-draft-preview" id="taskDraftPreview">正在建立任務摘要…</div>'
    + '<div class="task-picker" id="pickRow" style="display:none"><div class="task-picker-tools"><b>🎯 指定學生</b><button type="button" class="btn" id="pickAll" style="padding:3px 8px">全選</button><button type="button" class="btn" id="pickNone" style="padding:3px 8px">清空</button>'+groupPickBtns+'<span class="mini" id="taskPickCount">已選 0 人</span></div><div class="task-picker-list">'+pickBoxes+'</div><div class="mini" style="margin-top:7px">未勾選的學生不會看到此任務；再次按小組按鈕可切換該組全選／清空。</div></div>'
    + '<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn gold" id="tkAdd">📣 發布任務</button></div><div class="mini" style="margin-top:8px">學生回報後才進入審核；教師通過時才發放獎勵，退回後學生可以修正再挑戰。</div>';
  return '<div class="teacher-task-summary"><div><b>'+pendingSubs().length+'</b><span class="mini">待審核回報</span></div><div><b>'+leaderReadyCount()+'</b><span class="mini">組長可代審</span></div><div><b>'+activeN+'</b><span class="mini">進行中任務</span></div><div><b>'+diffN+'</b><span class="mini">差異化任務</span></div></div>'
    + '<div class="task-menu-grid"><details class="panel arena-menu-card task-menu-create"><summary>🏰 地下城自主複習 <span class="mini">勾選題庫・發布課後作業</span></summary><div class="arena-menu-body">'+dungeonQuick+'</div></details><details class="panel arena-menu-card task-menu-create" id="taskCreateMenu"'+(view.taskCreateOpen?' open':'')+'><summary>📣 發布／差異化任務 <span class="mini">對象・難度・獎勵</span></summary><div class="arena-menu-body">'+createBody+'</div></details>'
    + '<details class="panel arena-menu-card" id="taskReviewMenu"'+(view.taskReviewOpen?' open':'')+'><summary>✅ 待審核回報 <span class="mini">'+pendingSubs().length+' 件待處理</span></summary><div class="arena-menu-body">'+taskBatchToolbarHtml()+'<div class="task-review-list">'+pend+'</div></div></details>'
    + '<details class="panel arena-menu-card" id="taskListMenu"'+(view.taskListOpen?' open':'')+'><summary>📋 任務清單管理 <span class="mini">'+state.tasks.length+' 項・'+activeN+' 項啟用</span></summary><div class="arena-menu-body"><div class="task-manage-list">'+rows+'</div></div></details>'
    + '<details class="panel arena-menu-card task-menu-audit" id="taskAuditMenu"'+(view.taskAuditOpen?' open':'')+'><summary>🧾 審核來源紀錄 <span class="mini">最近 40 筆・可追查組長代審</span></summary><div class="arena-menu-body task-audit-table"><table><thead><tr><th>時間</th><th>學生</th><th>任務</th><th>審核者</th><th>結果</th></tr></thead><tbody>'+auditRows+'</tbody></table></div></details></div>';
}
function teacherBoss(){
  if(!classFeatureUnlocked("boss") && !state.boss){
    return classProgressHtml(true)+'<div class="panel unlock-note"><div style="font-size:42px">🔒</div><h3 style="justify-content:center">Boss 戰尚未解鎖</h3><div class="mini">'+classFeatureLockText("boss")+'。教師可在「解鎖進度」提前開放。</div></div>';
  }
  const pg = progCheck();
  if(pg.stage < 1 && !state.boss){                           // 探索未完且無進行中Boss→鎖定
    return progBannerHtml()
      + '<div class="panel" style="text-align:center;padding:36px"><div style="font-size:44px">🗺</div>'
      + '<h3 style="justify-content:center">今日探索尚未完成</h3>'
      + '<div class="mini">全班累計獲得 <b class="num">'+pg.exploreXp+' / '+pg.exploreGoal+'</b> XP 後,魔王就會現身!<br>(上課表現、任務、批次加分都算探索進度)</div></div>';
  }
  const b = state.boss;
  if(b && !b.standby) b.standby = {};      // 相容:v29 以前開始的戰鬥沒有此欄位
  if(!b){
    // 🎯 依全班規模自動建議 Boss HP:每人每輪傷害估算 × 目標 3 輪(可手改)
    const n = state.students.length || 1;
    const lv = avgPartyLevel();
    const avgAtk = 10 + (lv-1)*1.8;                        // v114 主屬性制:四職主屬性成長平均約1.8/級
    const perHit = Math.round(20 * (1 + (avgAtk-10)*0.02) * 1.15);   // 基礎20 × 攻擊倍率 × 技能係數
    const suggestHp = Math.max(300, Math.round(n * perHit * 3 / 50) * 50);   // 3 輪,取50整數
    return progBannerHtml() + '<div class="panel"><h3>召喚 Boss</h3><div class="inline-form">'
      + '<input type="text" id="bsName" placeholder="Boss 名稱(例:遲交作業魔王)" style="flex:1;min-width:170px">'
      + '<input type="number" id="bsHp" placeholder="HP" min="50" value="'+suggestHp+'">'
      + '<input type="number" id="bsXp" placeholder="每人XP" min="0" value="30">'
      + '<input type="number" id="bsGold" placeholder="每人金幣" min="0" value="20">'
      + '<button class="btn gold" id="bsStart">開戰!</button></div>'
      + '<div class="mini" style="margin-top:6px">💡 建議 HP <b class="num">'+suggestHp+'</b>:全班 '+n+' 人・平均 Lv'+lv.toFixed(1)+'・每人每刀約 '+perHit+' 傷害,這個血量約可撐 <b>3 輪</b>全班輪攻。想打快改小、想打持久戰改大。</div>'
      + '</div>';
  }
  const pct = Math.round(b.hp/b.maxHp*100);
  const gRank = Object.entries(b.groupDamage).map(([g,d])=>({g,d}))
    .sort((x,y)=>y.d-x.d)
    .map((x,i)=>'<tr><td><span class="lb-rank num">'+(i+1)+'</span></td><td>'+esc(x.g)+' 組'+(groupBalanced(x.g)?' <span class="mini" style="color:var(--ok)">職業齊全+20%</span>':'')+'</td><td class="num">'+x.d+' 傷害</td></tr>').join("")
    || '<tr><td colspan="3" class="mini">還沒有小組出手。</td></tr>';
  const _eb = b.elem ? ELEM_BOSSES[b.elem] : null;
  return '<div class="boss-stage elem-'+(_eb?_eb.key:'none')+'"><h3>🐉 '+esc(b.name)+(b.weakness?' <span class="mini" style="color:var(--gold)">⚡破綻中(下一擊+30%)</span>':'')+'</h3>'
    + (_eb ? '<div class="boss-showcase" style="--boss:'+_eb.color+'">'
        + elemBossImg(_eb.key, 110)
        + '<div style="flex:1"><div style="font-weight:900;font-size:15px">'+_eb.icon+' '+_eb.name+'</div>'
        + '<div class="mini" style="margin:4px 0">'+_eb.desc+'</div>'
        + (mapUnlocked(_eb.map)
            ? '<div class="mini" style="color:var(--gold)">✅ 【'+_eb.icon+' '+_eb.mapName+'】戰場已解鎖</div>'
            : '<div class="mini" style="color:#c0392b;font-weight:900">🔒 擊敗後解鎖團體戰新戰場【'+_eb.icon+' '+_eb.mapName+'】!</div>')
        + '</div></div>' : "")
    + (b.casting ? '<div class="boss-cast" style="color:#ffe08a;padding:10px;text-align:center;font-weight:700;margin-bottom:8px">⚠️ 烈焰隕石詠唱中!下一次「Boss 反擊」將對全體造成無視防禦傷害——快搶血、補血或搶攻!</div>' : "")
    + '<div class="goal-bar boss-bar"><i style="width:'+pct+'%"></i><span class="num">'+b.hp+' / '+b.maxHp+' HP</span></div>'
    + '<div class="mini" style="margin-top:4px">Boss 攻擊加成 +'+(b.atkBonus||0)+'(隨全班平均等級提升)'+(b.casting?'・詠唱中':'')+'</div>'
    + (function(){
        const g = nextAttackGroup();
        const order = [...new Set(state.students.map(x=>x.group))].filter(gr=>state.students.some(x=>x.group===gr)).sort((a,c)=>groupAvgAgi(c)-groupAvgAgi(a));
        const orderStr = order.map(gr=> (gr===g?'▶ ':'')+gr+'('+groupAvgAgi(gr).toFixed(0)+')'+(state.students.filter(x=>x.group===gr&&x.currentHp>0&&!b.standby[x.id]).length?'':' ✓')).join('  →  ');
        return '<div style="margin-top:8px;font-size:13px;font-weight:700;color:#141414">出手順序(依組平均敏捷):'+esc(orderStr||"—")+'</div>'
          + '<div class="inline-form" style="margin-top:10px">'
          + '<button class="btn gold" id="bsGroupAtk"'+(g?"":" disabled")+'>⚔️ '+(g?g+' 組攻擊':'全部打完')+'</button>'
          + '<button class="btn" id="bsSkip"'+(g?"":" disabled")+'>⏭ 跳過本組</button>'
          + '<button class="btn danger" data-bscounter="1">🐉 Boss 反擊</button>'
          + '<button class="btn" id="bsRest">全員休息</button>'
          + '<button class="btn" id="bsEnd">中止</button></div>';
      })()
    + '<div class="mini" style="margin-top:8px">擊敗獎勵:資源依小組貢獻組內平分・物品依個人貢獻機率掉落。Boss 反擊為機率技能:重擊/突襲/吐息/烈焰隕石/自癒,一次一招。</div></div>'
    + '<div class="panel"><h3>小組合作進度</h3><div class="mini">不公開個人傷害名次；由小組共同完成 Boss 目標。</div><table><tbody>'+gRank+'</tbody></table></div>';
}
function teacherCraft(){
  const pend = pendingDesigns().map(c=>{
    const creator = stu(c.creatorId);
    return '<div class="panel" style="background:#1b2136">'
      + '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">'
      + (c.type==="base" && c.img
          ? '<img src="'+c.img+'" style="width:70px;height:98px;object-fit:contain;background:#0d1120;border-radius:6px" alt="素體">'
          : (creator ? dollSVG(creator, 84, c) : customThumb(c, 70)))
      + '<div style="flex:1;min-width:150px"><b>'+esc(c.name)+'</b>'
      + (function(){ const ti = tierInfo(c.tier||"common");
        const af=c.affix?affixInfo(c.affix):null,ws=c.weaponSkill?forgeWeaponSkillInfo(c.weaponSkill):null;
        return '<div class="mini">'+ti.icon+ti.name+'圖紙・Lv.'+itemLevelOf(c)+'・'+TYPE_NAME[c.type]+'・創作:'+(creator?esc(creator.name):"?")+'・'+(FX_NAME[c.fx]||"無特效")+(af?'・'+af.icon+af.name+'詞條':'')+(ws?'・'+ws.icon+ws.name+' 8%':'')+(c.img?'・🖼圖片':(c.smooth?'・🫧平滑':'・🔲像素'))+'・'+c.t+'</div>'; })()
      + '<div class="mini">學生建議售價:'+c.price+' 金</div></div>'
      + '<div><button class="btn gold" data-dapprove="'+c.id+'">上架</button> '
      + '<button class="btn danger" data-dreject="'+c.id+'">退回</button></div></div>'
      + '<div class="inline-form" style="margin-top:10px">'
      + (function(){ const ti = tierInfo(c.tier||"common");
        const rg=ITEM_LEVEL_RANGE[ti.key]||[1,90], lv=Math.max(rg[0],Math.min(rg[1],itemLevelOf(c)));
        const mx=levelStatBudget(ti.key,lv,c.type),stats={atk:Number(c.atk)||0,def:Number(c.def)||0,agi:Number(c.agi)||0,int:Number(c.int)||0};
        const floor=equipmentPriceFloor(Object.assign({},c,stats,{itemLevel:lv}));
        return '物品Lv. <input type="number" data-f="level" data-id="'+c.id+'" value="'+lv+'" min="'+rg[0]+'" max="'+rg[1]+'" style="width:68px">'
        + '售價 <input type="number" data-f="price" data-id="'+c.id+'" value="'+Math.max(c.price, floor)+'" min="'+floor+'" style="width:88px">'
        + 'ATK <input type="number" data-f="atk" data-id="'+c.id+'" value="'+stats.atk+'" min="0" max="'+mx+'" style="width:64px">'
        + 'DEF <input type="number" data-f="def" data-id="'+c.id+'" value="'+stats.def+'" min="0" max="'+mx+'" style="width:64px">'
        + 'AGI <input type="number" data-f="agi" data-id="'+c.id+'" value="'+stats.agi+'" min="0" max="'+mx+'" style="width:64px">'
        + 'INT <input type="number" data-f="int" data-id="'+c.id+'" value="'+stats.int+'" min="0" max="'+mx+'" style="width:64px">'
        + '</div><div class="mini" data-price-floor="'+c.id+'" style="margin-top:6px">公式底價 '+floor+' 金・物品 Lv.'+lv+' 可分配能力值 '+mx+' 點；上架時創作者 +30 XP，之後每筆銷售抽 10% 版稅。</div></div>'; })();
  }).join("") || '<div class="mini">目前沒有待審核的作品。</div>';
  const live = state.customItems.filter(c=>c.status==="approved").map(c=>
    '<div class="item-card"><div class="iic">'+customThumb(c,30)+'</div>'
    + '<div class="inm">'+(state.weeklyFeaturedDesignId===c.id?'⭐ ':'')+esc(c.name)+'</div>'
    + '<div class="istats">Lv.'+itemLevelOf(c)+'・創作:'+esc((stu(c.creatorId)||{name:"?"}).name)+'・💰'+c.price+'</div>'
    + '<button class="btn'+(state.weeklyFeaturedDesignId===c.id?' gold':'')+'" data-dfeature="'+c.id+'">'+(state.weeklyFeaturedDesignId===c.id?'本週精選中':'⭐ 設為本週精選')+'</button> '
    + '<button class="btn danger" data-dremove="'+c.id+'">下架</button></div>').join("")
    || '<div class="mini">還沒有上架中的學生作品。</div>';
  return '<div class="panel"><h3>待審核作品('+pendingDesigns().length+')</h3><div class="mini" style="margin-bottom:10px">估價公式：25＋物品等級×3＋ATK×22＋DEF×18＋AGI×20＋INT×20，再加特效／詞條價值並進位至 10 金；各品級仍有最低價。</div>'+pend+'</div>'
    + '<div class="panel"><h3>上架中的學生商品</h3><div class="shop-grid">'+live+'</div>'
    + '<div class="mini" style="margin-top:8px">下架後商店不再販售;已購買並裝備的學生不受影響。</div></div>';
}
function teacherAnnounce(){
  const schedules=state.announcementSchedules||[],edit=schedules.find(x=>x.id===view.announcementEdit)||null;
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);tomorrow.setHours(7,0,0,0);
  const mode=edit?edit.mode:"now",title=edit?edit.title:"",content=edit?edit.content:"";
  const weekdayOpts=ANN_WEEKDAY_ZH.map((n,i)=>'<option value="'+i+'"'+((edit?+edit.eventWeekday:3)===i?' selected':'')+'>每週'+n+'</option>').join("");
  const leadOpts=[0,1,2,3].map(n=>'<option value="'+n+'"'+((edit?+edit.leadDays:1)===n?' selected':'')+'>'+(n?n+' 天前':'當天')+'</option>').join("");
  const scheduleList=schedules.map(sc=>{
    const kind=sc.mode==="weekly"?'🔁 每週'+ANN_WEEKDAY_ZH[+sc.eventWeekday||0]+' '+esc(sc.eventTime||"07:30")+'・提前 '+(+sc.leadDays||0)+' 天':'🕒 單次預約';
    const last=sc.lastFiredAt?'・上次 '+new Date(sc.lastFiredAt).toLocaleString("zh-TW",{hour12:false}):'';
    return '<div class="announce-schedule-card '+(sc.enabled?'':'off')+'"><div><b>'+esc(sc.title)+'</b><div class="mini">'+kind+'</div><div class="mini num">'+esc(announcementScheduleNextText(sc))+last+'</div></div>'
      +'<div class="actions"><button class="btn" data-asedit="'+sc.id+'">編輯</button><button class="btn" data-astoggle="'+sc.id+'">'+(sc.enabled?'暫停':'啟用')+'</button><button class="btn danger" data-asdel="'+sc.id+'">刪除</button></div></div>';
  }).join("")||'<div class="mini">尚未設定自動公告。可建立單次預約，或每週固定提醒。</div>';
  const list = state.announcements.map(a=>
    '<tr><td><b>'+esc(a.title)+'</b>'+(a.scheduled?' <span class="tag">⏱ 自動公告</span>':'')+'<div class="mini" style="white-space:pre-wrap">'+esc(a.content)+'</div><div class="mini num">'+a.t+'</div></td>'
    + '<td style="width:70px"><button class="btn danger" data-adel="'+a.id+'">刪除</button></td></tr>').join("")
    || '<tr><td class="mini">還沒有公告——發布第一則吧。</td></tr>';
  return '<div class="panel"><h3>📣 '+(edit?'編輯公告排程':'發布／預約公告')+'</h3><div class="announce-compose">'
    + '<label>公告標題<input type="text" id="anTitle" placeholder="例如：週三早自習小考" value="'+esc(title)+'"></label>'
    + '<label>公告內容<textarea id="anBody" placeholder="例如：請複習第二單元，記得攜帶文具。">'+esc(content)+'</textarea></label>'
    + '<label>發布方式<select id="anMode"><option value="now"'+(mode==="now"?' selected':'')+'>立即發布</option><option value="once"'+(mode==="once"?' selected':'')+'>單次預約</option><option value="weekly"'+(mode==="weekly"?' selected':'')+'>每週循環提醒</option></select></label>'
    + '<div class="announce-schedule-fields" data-anfields="once"'+(mode==="once"?'':' style="display:none"')+'><label>預定發布時間<input type="datetime-local" id="anOnceAt" value="'+esc(edit&&edit.mode==="once"?edit.publishAt:annLocalDateTimeValue(tomorrow))+'"></label></div>'
    + '<div class="announce-schedule-fields" data-anfields="weekly"'+(mode==="weekly"?'':' style="display:none"')+'><label>活動星期<select id="anWeekday">'+weekdayOpts+'</select></label><label>活動時間<input type="time" id="anEventTime" value="'+esc(edit&&edit.mode==="weekly"?edit.eventTime:"07:30")+'"></label><label>提前提醒<select id="anLeadDays">'+leadOpts+'</select></label><label>提醒發布時間<input type="time" id="anRemindTime" value="'+esc(edit&&edit.mode==="weekly"?edit.remindTime:"07:00")+'"></label></div>'
    + '<div class="announce-compose-actions"><span class="mini" id="anModeHint">'+(mode==="weekly"?'系統會在每次活動前依設定自動發布，且同一週只發布一次。':mode==="once"?'到達指定時間後自動發布一次。':'儲存後立刻讓學生看見。')+'</span>'
    + (edit?'<button class="btn" id="anCancelEdit">取消編輯</button>':'')+'<button class="btn gold" id="anAdd">'+(edit?'儲存排程':mode==="now"?'立即發布':'建立排程')+'</button></div></div>'
    + '<div class="mini" style="margin-top:8px">學生看完公告按「我看完了」解鎖當日 🃏 命運卡包(每日最多 '+SPIN_MAX+' 次;第 1 次免費,之後 30/60/100/160 金遞增；每月第 50、100 抽保障兩件傳說)。'
    + '卡包是金幣銷毀機制——目前已銷毀 🔥 <b class="num">'+(state.goldBurned||0)+'</b> 金。</div></div>'
    + '<div class="panel"><h3>⏱ 自動公告排程</h3><div class="mini" style="margin-bottom:8px">例如：活動設為每週三 07:30、提前 1 天、07:00 提醒，系統會在每週二 07:00 發出公告。</div><div class="announce-schedule-list">'+scheduleList+'</div></div>'
    + '<div class="panel"><h3>公告列表</h3><table><tbody>'+list+'</tbody></table></div>';
}
function teacherRewards(){
  const items=SHOP_ITEMS.filter(x=>x.type==="consumable");
  const opts='<option value="">不附加道具</option>'+items.map(x=>'<option value="'+x.id+'">'+x.icon+' '+esc(x.name)+'</option>').join("");
  const uniqueCards=[...new Map((state.rewardCards||[]).filter(c=>c&&c.code).map(c=>[String(c.code),c])).values()];
  const rows=uniqueCards.slice().reverse().map(c=>{
    const who=c.usedBy ? (stu(c.usedBy)||{}).name||c.usedBy : "尚未兌換";
    const prize=[c.xp?"+"+c.xp+" XP":"",c.gold?"+"+c.gold+" 金":"",c.diamonds?"+"+c.diamonds+" 💎":"",c.itemId?((itemById(c.itemId)||{}).name||"道具"):""].filter(Boolean).join("、");
    return '<tr><td><b>'+esc(c.title||"神秘獎勵")+'</b><div class="mini num">'+esc(c.code)+'</div></td><td class="mini">'+esc(prize||"自訂獎勵")+'</td><td class="mini">'+esc(who)+'</td><td style="white-space:nowrap">'+(c.usedBy?'<span class="mini">已兌換</span>':'<button class="btn" data-cardqr="'+esc(c.code)+'">QR</button> <button class="btn danger" data-cardstop="'+esc(c.code)+'">停用</button>')+'</td></tr>';
  }).join("") || '<tr><td colspan="4" class="mini">尚未產生獎勵卡。</td></tr>';
  return '<div class="panel"><h3>🎁 一次性獎勵卡</h3><div class="mini" style="line-height:1.7;margin-bottom:10px">產生後將 QR 給學生掃描，或直接提供兌換碼。每張卡只能由一位學生領取一次；線上班級會先在雲端鎖定兌換碼。</div>'
    + '<div class="inline-form"><input id="rcTitle" placeholder="獎勵名稱，例如：閱讀挑戰獎" style="min-width:190px;flex:1"><input id="rcXp" type="number" min="0" value="20" placeholder="XP" style="width:80px"><input id="rcGold" type="number" min="0" value="0" placeholder="金幣" style="width:80px"><input id="rcDiamond" type="number" min="0" max="3" value="0" placeholder="鑽石" style="width:80px"><select id="rcItem">'+opts+'</select><button class="btn gold" id="rcCreate"'+(rewardCardCreateBusy?' disabled':'')+'>'+(rewardCardCreateBusy?'正在建立…':'產生 QR 獎勵卡')+'</button></div><div class="mini" style="margin-top:7px">單張最多 3💎；學生仍受每週教師獎勵卡與鑽石總上限保護。</div>'
    + '<div class="panel" style="margin:14px 0 0"><h3>已發出的獎勵卡</h3><table><thead><tr><th>名稱／兌換碼</th><th>獎勵</th><th>狀態</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}
function openRewardQr(card){
  const link=rewardCardLink(card.code);
  modalHost.innerHTML='<div class="overlay" id="ovl"><div class="modal" style="max-width:440px;text-align:center"><h4>🎁 '+esc(card.title||"神秘獎勵")+'</h4><div class="mini">學生掃描 QR 後登入即可領取；也可手動輸入下方兌換碼。</div><div id="rewardQr" style="display:flex;justify-content:center;margin:14px;min-height:250px;align-items:center"><span class="mini">QR 產生中…</span></div><div class="panel" style="margin:6px 0"><b class="num" style="font-size:22px;letter-spacing:1px">'+esc(card.code)+'</b></div><a class="mini" href="'+esc(link)+'" target="_blank" rel="noopener">開啟兌換連結</a><br><button class="btn" id="rewardQrClose" style="margin-top:9px">關閉</button></div></div>';
  document.getElementById("ovl").onclick=e=>{ if(e.target.id==="ovl") modalHost.innerHTML=""; };
  document.getElementById("rewardQrClose").onclick=()=>modalHost.innerHTML="";
  loadQrLib(ok=>{const box=document.getElementById("rewardQr");if(!box)return;if(ok&&window.QRCode){try{box.innerHTML="";new QRCode(box,{text:link,width:250,height:250,correctLevel:QRCode.CorrectLevel.M});}catch(e){box.innerHTML='<div class="mini" style="color:#a32424">QR 產生失敗，請使用下方兌換碼或連結。</div>';}}else box.innerHTML='<div class="mini" style="color:#a32424">QR 元件載入失敗，請使用下方兌換碼或連結。</div>';});
}
function baseTuneSample(variant,tune){
  return {roStyle:true,gender:variant.indexOf('female')===0?'female':'male',baseVariant:variant,job:'Warrior',level:1,
    hatId:1,clothesId:4,pantsId:40,shoesId:15,backId:17,weaponId:9,
    hairId:null,eyesId:null,browsId:null,noseId:null,blueprints:{},baseTune:Object.assign({x:0,y:0,s:1},tune||{})};
}
function openBaseTunePresetEditor(variant){
  if(!BASE_VARIANTS[variant]) return;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let tune=Object.assign({x:0,y:0,s:1},(state.baseTunePresets||{})[variant]||{}), drag=null;
  modalHost.innerHTML='<div class="overlay" id="basePresetOverlay"><div class="modal" style="max-width:410px;text-align:center">'
    +'<h3 style="margin-top:0">🎯 '+esc(BASE_VARIANT_SPEC[variant].label)+'</h3>'
    +'<div class="mini" style="line-height:1.7;margin-bottom:8px">拖曳人物調整位置，拖曳右上角 ↗ 調整大小；裝備保持固定。</div>'
    +'<div id="basePresetStage" style="height:300px;position:relative;display:flex;align-items:flex-end;justify-content:center;touch-action:none;user-select:none;overflow:visible"></div>'
    +'<div class="mini">調整後只會套用到之後的新生註冊；現有學生不會被改動。</div>'
    +'<div style="display:flex;gap:8px;justify-content:center;margin-top:12px"><button class="btn" id="basePresetReset">還原基準</button><button class="btn" id="basePresetCancel">取消</button><button class="btn gold" id="basePresetSave">儲存到註冊頁</button></div></div></div>';
  const stage=document.getElementById('basePresetStage');
  const draw=()=>{
    stage.innerHTML='<div style="position:relative;width:240px;height:295px;display:flex;align-items:flex-end;justify-content:center;cursor:move">'
      +dollSVG(baseTuneSample(variant,tune),235)
      +'<button type="button" id="basePresetGrip" aria-label="拖曳縮放素體" title="拖曳縮放素體" style="position:absolute;right:0;top:2px;width:34px;height:34px;padding:0;border:2px solid #141414;border-radius:8px;background:var(--gold);font-size:21px;font-weight:900;cursor:nwse-resize;z-index:4">↗</button></div>';
  };
  draw();
  stage.addEventListener('pointerdown',e=>{
    const grip=e.target.closest&&e.target.closest('#basePresetGrip');
    drag={id:e.pointerId,mode:grip?'scale':'move',x:e.clientX,y:e.clientY,tune:Object.assign({},tune)};
    stage.setPointerCapture(e.pointerId);e.preventDefault();
  });
  stage.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(drag.mode==='scale')tune.s=clamp(drag.tune.s+(dx-dy)/190,.55,1.65);
    else{tune.x=clamp(drag.tune.x+dx*.42,-18,18);tune.y=clamp(drag.tune.y+dy*.42,-18,18);}
    draw();
  });
  const stop=e=>{if(drag&&drag.id===e.pointerId){drag=null;try{stage.releasePointerCapture(e.pointerId);}catch(_){}}};
  stage.addEventListener('pointerup',stop);stage.addEventListener('pointercancel',stop);
  document.getElementById('basePresetReset').onclick=()=>{tune={x:0,y:0,s:1};draw();};
  document.getElementById('basePresetCancel').onclick=()=>{modalHost.innerHTML='';};
  document.getElementById('basePresetOverlay').onclick=e=>{if(e.target.id==='basePresetOverlay')modalHost.innerHTML='';};
  document.getElementById('basePresetSave').onclick=()=>{
    state.baseTunePresets=state.baseTunePresets||{};state.baseTunePresets[variant]=Object.assign({},tune);
    save();modalHost.innerHTML='';toast('已將 '+BASE_VARIANT_SPEC[variant].label+' 的位置與大小儲存到註冊頁');render();
  };
}
function teacherArt(){
  const w = stu("T01");
  const usage = Math.round(JSON.stringify(state.art||{}).length/1024);
  const row = (key, label)=>{
    const has = !!(state.art && state.art[key]);
    return '<tr><td style="width:52px">'+(has?'<img src="'+state.art[key]+'" width="44" height="44" style="border-radius:6px;background:#10141f">':'<span class="mini">向量</span>')+'</td>'
      + '<td>'+esc(label)+'<div class="mini num">'+key+'</div></td>'
      + '<td style="white-space:nowrap"><label class="btn">匯入<input type="file" accept="image/*" data-artin="'+key+'" style="display:none"></label> '
      + (has?'<button class="btn danger" data-artdel="'+key+'">清除</button>':'')+'</td></tr>';
  };
  const baseRows = [["base:male","男角色通用素體"],["base:female","女角色通用素體"]].map(x=>row(x[0],x[1])).join("");
  const itemRows = SHOP_ITEMS.filter(i=>i.type!=="consumable").map(i=>{
    const key="item:"+i.id, has=!!(state.art&&state.art[key]);
    return '<tr><td style="width:60px;text-align:center">'+(has?'<img src="'+state.art[key]+'" width="46" height="46" style="object-fit:contain;border-radius:6px;background:#10141f">':itemArtThumb(i,46))+'</td>'
      + '<td><b>'+esc(i.name)+'</b><div class="mini">'+TYPE_NAME[i.type]+'・'+(RARITY_ZH[i.rarity]||i.rarity)+'・預設向量版</div><div class="mini num">'+key+'</div></td>'
      + '<td style="white-space:nowrap"><label class="btn">替換圖<input type="file" accept="image/png,image/webp" data-artin="'+key+'" style="display:none"></label> '+(has?'<button class="btn danger" data-artdel="'+key+'">回復預設</button>':'')+'</td></tr>';
  }).join("");
  const tuneCards=Object.keys(BASE_VARIANTS).map(k=>{
    const tune=((state.baseTunePresets||{})[k])||{x:0,y:0,s:1};
    return '<div style="background:#fff;border:2px solid #141414;border-radius:10px;padding:7px;text-align:center">'
      +dollSVG(baseTuneSample(k,tune),100)+'<b style="display:block;font-size:13px">'+esc(BASE_VARIANT_SPEC[k].label)+'</b>'
      +'<button class="btn" data-basepreset="'+k+'" style="margin-top:5px;padding:3px 8px;font-size:12px">🎯 調整大小位置</button></div>';
  }).join('');
  return '<div class="panel"><h3>美術管理(PNG 圖層)</h3>'
    + '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">'
    + (w ? dollSVG(w, 170) : "")
    + '<div class="mini" style="flex:1;min-width:220px;line-height:1.8">匯入的圖會自動縮到 256×256 並存進本檔資料(隨備份走)。<br>'
    + '<b>裝備圖規格:</b>透明 PNG/WebP、只畫單一部位、不留底色；武器直立置右、背飾置中、帽子貼頭頂。工坊的黃色虛線框就是實際穿戴範圍。<br>'
    + '每個裝備列會顯示預設美術；替換圖後可隨時按「回復預設」。目前佔用:<b class="num">'+usage+' KB</b>(建議 <2000 KB)</div></div></div>'
    + '<div class="panel"><h3>🎯 新生註冊素體校正</h3><div class="mini" style="margin-bottom:10px;line-height:1.7">八款素體都可以由教師個別調整大小與位置；儲存後，學生註冊頁會直接套用，不讓學生自行改動。</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:9px">'+tuneCards+'</div></div>'
    + '<div class="panel"><h3>基礎體(含身體+髮型+臉+職業服)</h3><table><tbody>'+baseRows+'</tbody></table></div>'
    + '<div class="panel"><h3>裝備圖層</h3><table><tbody>'+itemRows+'</tbody></table></div>';
}
function teacherLog(){
  const alog = (state.awardLog||[]).slice(-40).reverse().map(lg=>{
    const s = stu(lg.sid);
    return '<tr'+(lg.reverted?' style="opacity:.45;text-decoration:line-through"':'')+'>'
      + '<td class="mini num">'+esc(lg.t)+'</td><td>'+(s?esc(s.name):"?")+'</td>'
      + '<td>'+esc(lg.reason)+'</td><td class="num">'+(lg.xp?"+"+lg.xp+"XP ":"")+(lg.gold?"+"+lg.gold+"金":"")+'</td>'
      + '<td>'+(lg.reverted?'<span class="mini">已撤回</span>':'<button class="btn danger" data-revaward="'+lg.id+'" style="padding:2px 10px;font-size:12px">撤回</button>')+'</td></tr>';
  }).join("") || '<tr><td colspan="5" class="mini">還沒有加分紀錄</td></tr>';
  const todayKey = new Date().toLocaleDateString("zh-TW");
  const dayKey = (v)=>{
    const d=new Date(String(v||""));
    return isNaN(d.getTime()) ? String(v||"").split(/[ ,]/)[0] : d.toLocaleDateString("zh-TW");
  };
  const todayAwards=(state.awardLog||[]).filter(x=>!x.reverted&&dayKey(x.t)===todayKey);
  const todayLogs=(state.log||[]).filter(x=>dayKey(x.t)===todayKey);
  const recipients=new Set(todayAwards.map(x=>x.sid));
  const totalXp=todayAwards.reduce((n,x)=>n+(Number(x.xp)||0),0);
  const totalGold=todayAwards.reduce((n,x)=>n+(Number(x.gold)||0),0);
  const answerCount=todayLogs.filter(x=>String(x.msg||"").indexOf("回答知識挑戰")>=0).length;
  const taskCount=todayAwards.filter(x=>String(x.reason||"").indexOf("完成任務")>=0).length;
  const statCard=(icon,value,label)=>'<div style="min-width:108px;flex:1;background:#fff;border:3px solid #141414;border-radius:10px;padding:10px;text-align:center;box-shadow:3px 3px 0 rgba(20,20,20,.7)"><div style="font-size:20px">'+icon+'</div><b class="num" style="display:block;font-size:20px;color:#141414">'+value+'</b><span class="mini" style="color:#555">'+label+'</span></div>';
  const todayStats='<div class="panel"><h3>📊 今日課堂統計・'+esc(todayKey)+'</h3>'
    +'<div style="display:flex;gap:9px;flex-wrap:wrap">'
    +statCard('🎁',todayAwards.length,'發放次數')+statCard('🧑‍🎓',recipients.size,'獲獎學生')
    +statCard('✨',totalXp,'發放 XP')+statCard('💰',totalGold,'發放金幣')
    +statCard('💡',answerCount,'課堂回答')+statCard('📌',taskCount,'完成任務')+'</div>'
    +'<div class="mini" style="margin-top:10px">統計會在每天自動重新計算；撤回的獎勵不列入總數。</div></div>';
  const isMajor=(msg)=>/(教師開始上課|教師結束本節課|全班達成|榮耀之城|巔峰之城|世界霸主|公會戰|積分循環賽|Boss「.*(?:出現|擊敗|中止)|魔王被擊破|探索完成|競技場開放|直接開放了今日競技場|老師發布公告|老師發布任務|發起知識挑戰|知識挑戰結束|自行加入公會|完成綁定|加入公會,冒險開始|升至 Lv\.|轉職為|獲得稱號|作品「.*通過審核|改名通過|傳說轉生)/.test(String(msg||""));
  const logs = (state.log||[]).filter(l=>isMajor(l.msg)).slice(0,40).map(l=>{
    const s = stu(l.sid);
    return '<li><span class="num">['+l.t+']</span> '+(s?esc(s.name):"")+':'+esc(l.msg)+'</li>';
  }).join("") || '<li class="mini">尚無重大事件；升級、轉職、Boss、城堡與公會戰等紀錄會顯示在這裡。</li>';
  return '<div class="panel"><h3>💰 加分紀錄(最近 40 筆,點錯可撤回)</h3>'
    + '<div style="max-height:38vh;overflow:auto"><table><thead><tr><th>時間</th><th>學生</th><th>理由</th><th>發放</th><th></th></tr></thead><tbody>'+alog+'</tbody></table></div></div>'
    + todayStats
    + '<div class="panel"><h3>📜 重大事件(最近 40 筆)</h3><div class="mini" style="margin-bottom:8px">一般加分、購物、技能裝卸與逐回合戰鬥訊息已省略；學生個人學習紀錄仍會保留。</div><ul class="log-list" style="max-height:40vh">'+logs+'</ul></div>';
}
/* 浮動控制台:拖曳(滑鼠+觸控)、收合成圓鈕(圓鈕也可拖) */
let _fcPos = null;      // 記住位置
let _fcCollapsed = false; // 記住收合狀態
function bindFloatConsole(){
  const fc = document.getElementById("float-console");
  if(!fc) return;
  // 套用記住的位置
  if(_fcPos){
    fc.style.left = _fcPos.left + "px";
    fc.style.top = _fcPos.top + "px";
    fc.style.right = "auto";
    fc.style.bottom = "auto";
  }
  // 收合狀態記憶
  if(_fcCollapsed){ fc.classList.remove("fc-open"); fc.classList.add("fc-collapsed"); }

  const clampPos = (left, top, el)=>{
    const w = el.offsetWidth, h = el.offsetHeight;
    left = Math.max(4, Math.min(window.innerWidth - w - 4, left));
    top  = Math.max(4, Math.min(window.innerHeight - h - 4, top));
    return {left, top};
  };
  const startDrag = (handle)=>{
    let dragging=false, sx=0, sy=0, ox=0, oy=0, moved=false;
    const onDown = (e)=>{
      dragging=true; moved=false;
      const p = e.touches ? e.touches[0] : e;
      const r = fc.getBoundingClientRect();
      sx=p.clientX; sy=p.clientY; ox=r.left; oy=r.top;
      fc.style.right="auto"; fc.style.bottom="auto";
      fc.style.left=r.left+"px"; fc.style.top=r.top+"px";
      e.preventDefault();
    };
    const onMove = (e)=>{
      if(!dragging) return;
      const p = e.touches ? e.touches[0] : e;
      const dx=p.clientX-sx, dy=p.clientY-sy;
      if(Math.abs(dx)>3||Math.abs(dy)>3) moved=true;
      const pos = clampPos(ox+dx, oy+dy, fc);
      fc.style.left=pos.left+"px"; fc.style.top=pos.top+"px";
      _fcPos = pos;
      e.preventDefault();
    };
    const onUp = ()=>{ dragging=false; };
    handle.addEventListener("mousedown", onDown);
    handle.addEventListener("touchstart", onDown, {passive:false});
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, {passive:false});
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return ()=>moved;   // 回傳「是否拖動過」判斷
  };
  const dragBar = document.getElementById("fcDrag");
  if(dragBar) startDrag(dragBar);
  const bubble = document.getElementById("fcBubble");
  let bubbleMoved;
  if(bubble) bubbleMoved = startDrag(bubble);
  // 收合
  const minBtn = document.getElementById("fcMin");
  if(minBtn) minBtn.onclick = (e)=>{ e.stopPropagation(); fc.classList.remove("fc-open"); fc.classList.add("fc-collapsed"); _fcCollapsed=true; };
  // 圓鈕:沒拖動才展開(拖動就只是移動)
  if(bubble) bubble.addEventListener("click", ()=>{ if(bubbleMoved && bubbleMoved()) return; fc.classList.remove("fc-collapsed"); fc.classList.add("fc-open"); _fcCollapsed=false; });
}
function bindTeacher(){
  app.querySelectorAll("[data-roster-section]").forEach(button=>button.onclick=()=>{
    view.rosterSection=button.dataset.rosterSection||"import";render();
  });
  const classStartBtn=document.getElementById("classStartBtn");
  if(classStartBtn) classStartBtn.onclick=()=>{
    (async()=>{
      state.classSession=makeClassSession();
      addLog("-","📚 教師開始上課"); save();
      try{
        if(CLOUD.on()) await CLOUD.syncClassSession();
        render(); setTimeout(openQrModal,0);
      }catch(e){ render(); toast("開始上課成功，但 QR 狀態尚未同步到雲端："+(e.message||e),true); }
    })();
  };
  const classEndBtn=document.getElementById("classEndBtn");
  if(classEndBtn) classEndBtn.onclick=()=>{
    modalConfirm("確定結束本節課？目前的學生登入 QR Code 會立即失效。",async()=>{
      state.classSession.active=false; state.classSession.endedAt=Date.now(); state.classSession.expiresAt=0; state.classSession.token="";
      addLog("-","🏁 教師結束本節課"); save();
      try{ if(CLOUD.on()) await CLOUD.syncClassSession(); }catch(e){ toast("課堂狀態雲端同步失敗："+(e.message||e),true); }
      render(); toast("本節課已結束，QR Code 已失效");
    },"結束上課");
  };
  const classShowQr=document.getElementById("classShowQr");
  if(classShowQr) classShowQr.onclick=openQrModal;
  const classGoBoard=document.getElementById("classGoBoard");
  if(classGoBoard) classGoBoard.onclick=()=>{ view.tview="board"; view.boardMenu=false; render(); };
  const classOpenRoster=document.getElementById("classOpenRoster");
  if(classOpenRoster) classOpenRoster.onclick=()=>{ view.tview="roster";view.rosterSection="import";render(); };
  const cuToggle=document.getElementById("classUnlockToggle");
  if(cuToggle) cuToggle.onclick=()=>{
    state.classUnlocks.enabled=!state.classUnlocks.enabled;
    addLog("-",state.classUnlocks.enabled?"🏫 教師啟用全班 XP 漸進解鎖":"🔓 教師暫時開放全部班級功能");
    save(); render();
  };
  const cuAuto=document.getElementById("classUnlockAuto");
  if(cuAuto) cuAuto.onclick=()=>{
    state.classUnlocks.enabled=true; state.classUnlocks.manualStage=0;
    save(); render(); toast("已恢復依全班累積 XP 自動解鎖");
  };
  const cuPreview=document.getElementById("classUnlockPreview");
  if(cuPreview) cuPreview.onclick=()=>{
    const previewStage=CLASS_UNLOCK_STAGES[Math.max(1,classEffectiveStage())]||CLASS_UNLOCK_STAGES[1];
    showClassUnlockCelebration([previewStage]);
  };
  const cuScale=document.getElementById("classUnlockScale");
  if(cuScale){
    cuScale.value=String(state.classUnlocks.scale||1);
    cuScale.onchange=()=>{
      state.classUnlocks.scale=Math.max(.25,Math.min(3,Number(cuScale.value)||1));
      classUnlockSync(true); save(); render(); toast("班級解鎖門檻已調整為 "+state.classUnlocks.scale+"×");
    };
  }
  app.querySelectorAll("[data-classstage]").forEach(b=>b.onclick=()=>{
    const stage=Math.max(0,Math.min(CLASS_UNLOCK_STAGES.length-1,+b.dataset.classstage||0));
    state.classUnlocks.enabled=true; state.classUnlocks.manualStage=stage;
    addLog("-","🔓 教師提前開放班級功能至「"+CLASS_UNLOCK_STAGES[stage].name+"」");
    save(); render(); toast("已提前開放至「"+CLASS_UNLOCK_STAGES[stage].name+"」");
  });
  app.querySelectorAll("[data-classgate]").forEach(b=>b.onclick=()=>{
    const key=b.dataset.classgate,info=CLASS_GATE_INFO[key];if(!info)return;
    const related=Object.keys(CLASS_FEATURE_GATES).filter(f=>CLASS_FEATURE_GATES[f]===key),need=Math.min(...related.map(classFeatureStage));
    if(!state.classUnlocks.teacherGates[key]&&classEffectiveStage()<need){toast("需先達第 "+need+" 階段，才能由教師開啟「"+info.name+"」",true);return;}
    state.classUnlocks.teacherGates[key]=!state.classUnlocks.teacherGates[key];
    addLog("-",(state.classUnlocks.teacherGates[key]?"✅ 教師確認開放":"⏸ 教師暫停")+"「"+info.name+"」");
    save();render();toast((state.classUnlocks.teacherGates[key]?"已開放 ":"已暫停 ")+info.name);
  });
  const rcCreate=document.getElementById("rcCreate");
  if(rcCreate) rcCreate.onclick=async ()=>{
    if(rewardCardCreateBusy)return;
    const num=id=>Math.max(0,Math.floor(+document.getElementById(id).value||0));
    const card={code:rewardCode(),title:document.getElementById("rcTitle").value.trim()||"神秘獎勵",xp:num("rcXp"),gold:num("rcGold"),diamonds:Math.min(3,num("rcDiamond")),itemId:+document.getElementById("rcItem").value||null,active:true,createdAt:Date.now(),usedBy:null,usedAt:null,status:"ready"};
    if(!card.xp&&!card.gold&&!card.diamonds&&!card.itemId){ toast("至少設定一種獎勵", true); return; }
    rewardCardCreateBusy=true;rcCreate.disabled=true;rcCreate.textContent="正在建立…";
    try{
      if(CLOUD.on()) await CLOUD.createRewardCard(card);
      const existing=(state.rewardCards||[]).find(x=>x.code===card.code);if(existing)Object.assign(existing,card);else state.rewardCards.push(card);
      rewardCardCreateBusy=false;save(); render();
      setTimeout(()=>openRewardQr(card),0);
    }catch(e){rewardCardCreateBusy=false;toast("產生失敗："+(e.message||e), true);rcCreate.disabled=false;rcCreate.textContent="產生 QR 獎勵卡";}
  };
  app.querySelectorAll("[data-cardqr]").forEach(b=>b.onclick=()=>{
    const c=(state.rewardCards||[]).find(x=>x.code===b.dataset.cardqr); if(c) openRewardQr(c);
  });
  app.querySelectorAll("[data-cardstop]").forEach(b=>b.onclick=async ()=>{
    const c=(state.rewardCards||[]).find(x=>x.code===b.dataset.cardstop); if(!c) return;
    try{ if(CLOUD.on()) await CLOUD.setRewardCardActive(c.code,false); c.active=false; save(); render(); toast("已停用獎勵卡"); }
    catch(e){ toast("停用失敗："+(e.message||e),true); }
  });
  // ══ 📈 配分指南:三個操作按鈕 ══
  const econSave=document.getElementById("econSave");
  if(econSave)econSave.onclick=()=>{
    const n=(id,a,b,fallback)=>Math.max(a,Math.min(b,Math.floor(Number(document.getElementById(id)?.value)||fallback)));
    const ec=economyCfg();ec.dailyGoldCap=n("econDailyCap",0,5000,500);ec.dungeonDailyGoldCap=n("econDungeonCap",0,500,20);
    ec.peerReviewGold=n("econPeerGold",0,500,20);ec.peerReviewDiamondEvery=n("econPeerEvery",5,100,20);ec.peerReviewWeeklyDiamondCap=n("econPeerWeek",0,2,1);
    ec.rewardDiamondWeeklyCap=n("econRewardGemWeek",0,5,3);ec.learningDiamondWeeklyCap=n("econLearnGemWeek",0,3,2);ec.totalDiamondWeeklyCap=n("econTotalGemWeek",1,10,6);
    save();toast("💰 班級經濟設定已儲存：1💎＝1,000 金");render();
  };
  const gdCap = document.getElementById("gdCapToggle");
  if(gdCap) gdCap.onclick = ()=>{
    state.dailyCapOn = !state.dailyCapOn;
    toast(state.dailyCapOn ? "✅ 每日常規 EXP 上限已啟用" : "⛔ 每日上限已關閉(加分不再受限)");
    save(); render();
  };
  const gdRub = document.getElementById("gdApplyRubric");
  if(gdRub) gdRub.onclick = ()=>{
    // 依全班中位數等級決定學年,把四向度寫入快捷加分鈕
    const lvs = state.students.map(s=>s.level).sort((a,b)=>a-b);
    const mid = lvs.length ? lvs[Math.floor(lvs.length/2)] : 1;
    const st = gradeStageOf(mid);
    const key = st.grade==="七年級" ? "g7" : (st.grade==="八年級" ? "g8" : "g9");
    const R = [
      {name:"課前準備", g7:20, g8:50,  g9:75},
      {name:"課堂參與", g7:40, g8:120, g9:200},
      {name:"作業完成", g7:60, g8:180, g9:300},
      {name:"隨堂表現", g7:40, g8:140, g9:250}
    ];
    modalConfirm("依全班中位數 Lv."+mid+"("+st.grade+")套用配分範本?\n"
      + R.map(r=>r.name+" +"+r[key]+" XP").join("\n")
      + "\n\n(會覆蓋現有的快捷加分鈕設定)", ()=>{
      state.awardPresets = R.map(r=>({name:r.name, xp:r[key], gold:0}));
      toast("📋 已套用"+st.grade+"配分範本到快捷加分鈕");
      save(); render();
    }, "套用");
  };
  const gdQ = document.getElementById("gdDeployQuests");
  if(gdQ) gdQ.onclick = ()=>{
    const lvs = state.students.map(s=>s.level).sort((a,b)=>a-b);
    const mid = lvs.length ? lvs[Math.floor(lvs.length/2)] : 1;
    const st = gradeStageOf(mid);
    const key = st.grade==="七年級" ? "g7" : (st.grade==="八年級" ? "g8" : "g9");
    const Q = [
      {n:"📕 段考副本", g7:800, g8:2500, g9:4000},
      {n:"✏️ 錯題訂正大師", g7:100, g8:300, g9:500},
      {n:"🧑‍🏫 數學小老師", g7:100, g8:300, g9:500},
      {n:"⏱ 限時挑戰", g7:150, g8:450, g9:750},
      {n:"🏆 單元成就解鎖", g7:200, g8:550, g9:900},
      {n:"🔍 生活數學專題", g7:600, g8:1800, g9:2600},
      {n:"📐 競賽與檢定", g7:500, g8:1500, g9:2200},
      {n:"🌱 補救全勤", g7:150, g8:400, g9:700}
    ];
    const exists = Q.filter(q=> state.tasks.some(t=>t.title===q.n && t.active)).length;
    modalConfirm("依"+st.grade+"標準建立 "+(Q.length-exists)+" 個任務?"
      + (exists? "\n(已存在 "+exists+" 個,會略過)" : "")
      + "\n\n任務 EXP 不受每日上限管制。", ()=>{
      let n = 0;
      Q.forEach(q=>{
        if(state.tasks.some(t=>t.title===q.n && t.active)) return;
        createTask(q.n, q[key], 0, "all");
        n++;
      });
      toast("🎯 已建立 "+n+" 個任務("+st.grade+"標準)");
      save(); render();
    }, "建立");
  };

  app.querySelectorAll("[data-award]").forEach(b=>{
    b.onclick = (ev)=>{
      if(view.locked){ toast("投影模式中,操作已鎖定", true); return; }
      if(view.multiSel){                                     // 批次模式:點角色=勾選/取消
        const sid = b.dataset.award;
        const i = view.multiSel.indexOf(sid);
        if(i>=0) view.multiSel.splice(i,1); else view.multiSel.push(sid);
        render(); return;
      }
      if(state.lesson && state.lesson.active){ lessonAnswer(b.dataset.award, {x:ev.clientX,y:ev.clientY}); return; }
      openAwardModal(b.dataset.award, ev);
    };
  });
  const bq = document.getElementById("btnQr");
  if(bq) bq.onclick = openQrModal;
  const pge = document.getElementById("progGoalEdit");
  if(pge) pge.onclick = (e)=>{
    e.preventDefault();
    const pg = progCheck();
    const v = prompt("設定今日探索目標 XP(全班累計):", pg.exploreGoal);
    if(v===null) return;
    const n = Math.max(10, parseInt(v)||0);
    pg.exploreGoal = n;
    if(pg.stage===0 && pg.exploreXp >= n){ pg.stage = 1; addLog("-","🗺 探索完成!魔王現身!"); }
    save(); render(); toast("探索目標:"+n+" XP");
  };
  const pgu = document.getElementById("progUnlock");
  if(pgu) pgu.onclick = ()=>{
    const pg = progCheck();
    pg.stage = 2;
    addLog("-","🔓 老師直接開放了今日競技場");
    sfx("goal");
    save(); render(); toast("🔓 已解鎖今日競技場(含公會戰)");
  };
  const bm = document.getElementById("btnMulti");
  if(bm) bm.onclick = ()=>{
    view.multiSel = view.multiSel ? null : [];
    render();
    if(view.multiSel) toast("批次模式:點角色勾選,再按「發獎勵」");
  };
  const bl=document.getElementById("btnLesson");
  if(bl) bl.onclick=()=>{
    if(state.lesson && state.lesson.active){
      const done=Object.keys(state.lesson.answered||{}).length;
      state.lesson.active=false; addLog("-","🏁 知識挑戰結束，共 "+done+" 人完成。"); save(); render(); toast("本題結束，下一題再來！"); return;
    }
    openLessonChallengeModal();
  };
  const zoneLock=document.getElementById("zoneLock");if(zoneLock)zoneLock.onclick=()=>{const l=state.lesson;if(!l)return;l.locked=!l.locked;if(!l.locked){l.endsAt=Date.now()+Math.max(10,Math.min(180,+l.durationSec||30))*1000;if(l.quizMode==="buzzer"){l.buzzerWinner=null;l.buzzerStoppedAt=0;l.buzzerRemainingMs=0;state.students.forEach(s=>{const z=zoneAnswerState(s,l);z.confirmed=false;});}}save();render();toast(l.locked?"🔒 已鎖定答案":"🔓 已重新開放並重設倒數");};
  const zoneReveal=document.getElementById("zoneReveal");if(zoneReveal)zoneReveal.onclick=()=>{const l=state.lesson;if(!l)return;l.reveal=!l.reveal;save();render();};
  const zoneSettle=document.getElementById("zoneSettle");if(zoneSettle)zoneSettle.onclick=()=>{
    const l=state.lesson;if(!l||l.mode!=="zone"||l.settled)return;if(l.quizMode==="offline"){openOfflineRewardPicker();return;}const ids=state.students.filter(s=>{const z=s.liveAnswer||{};return z.questionId===l.questionId&&z.confirmed&&z.answer===l.correct;}).map(s=>s.id);settleZoneLesson(ids,false);
  };
  const zoneNext=document.getElementById("zoneNext");if(zoneNext)zoneNext.onclick=startNextBankQuestion;
  const zoneEnd=document.getElementById("zoneEnd");if(zoneEnd)zoneEnd.onclick=()=>{const l=state.lesson;if(!l)return;if(!l.settled&&!confirm("尚未結算獎勵，仍要結束本題？"))return;l.active=false;addLog("-","🏁 角色站位答題結束");save();render();};
  const zoneBack=document.getElementById("zoneBack");if(zoneBack)zoneBack.onclick=()=>{const l=state.lesson;if(!l)return;const leave=()=>{l.active=false;addLog("-","↩ 返回大屏並結束角色站位答題");save();render();};if(l.settled)leave();else modalConfirm("這題尚未結算，返回大屏會結束本題。",leave,"返回大屏");};
  app.querySelectorAll("[data-offline-answer]").forEach(b=>b.onclick=()=>{const l=state.lesson;if(!l||l.locked||Date.now()<(l.readyUntil||0))return;const [sid,answer]=b.dataset.offlineAnswer.split("|"),s=stu(sid);if(!s)return;const z=zoneAnswerState(s,l),spots={A:[25,25],B:[75,25],C:[25,75],D:[75,75]};z.answer=answer;z.confirmed=true;z.x=spots[answer][0];z.y=spots[answer][1];z.updatedAt=Date.now();save();render();});
  const offlineClear=document.getElementById("offlineClear");if(offlineClear)offlineClear.onclick=()=>{const l=state.lesson;if(!l||l.locked)return;state.students.forEach(s=>{const z=zoneAnswerState(s,l),p=zoneSpawn(s);z.answer="";z.confirmed=false;z.x=p.x;z.y=p.y;});save();render();};
  const teacherBankImport=document.getElementById("teacherBankImport");if(teacherBankImport)teacherBankImport.onchange=()=>importTeacherQuestionBank(teacherBankImport.files&&teacherBankImport.files[0]);
  app.querySelectorAll("[data-bankdel]").forEach(b=>b.onclick=()=>modalConfirm("刪除這一題？",()=>{state.teacherQuestions=(state.teacherQuestions||[]).filter(q=>q.id!==b.dataset.bankdel);save();render();},"刪除"));
  const teacherBankClear=document.getElementById("teacherBankClear");if(teacherBankClear)teacherBankClear.onclick=()=>modalConfirm("清除全部自訂題庫？內建題庫不受影響。",()=>{state.teacherQuestions=[];save();render();},"全部清除");
  const bmg = document.getElementById("btnMultiGo");
  if(bmg) bmg.onclick = ()=> openMultiModal();
  app.querySelectorAll("[data-gaward]").forEach(b=>{
    b.onclick = ()=>{
      if(view.locked){ toast("投影模式中,操作已鎖定", true); return; }
      openGroupModal(b.dataset.gaward);
    };
  });
  const lk = document.getElementById("btnLock");
  if(lk) lk.onclick = ()=>{
    view.locked = !view.locked;
    toast(view.locked ? "已進入投影模式:點角色不會觸發加分" : "已解鎖,恢復操作");
    render();
  };
  const ge = document.getElementById("goalEdit");
  if(ge) ge.onclick = ()=>{
    const pg = progCheck();
    const v = prompt("設定今日探索目標 XP(全班累計,目前 "+pg.exploreGoal+"):", pg.exploreGoal);
    const n = parseInt(v,10);
    if(n>0){
      pg.exploreGoal = n;
      if(pg.stage===0 && pg.exploreXp >= n){ pg.stage=1; addLog("-","🗺 探索完成!魔王現身!"); }
      save(); render();
    }
  };
  const ex = document.getElementById("btnExport"); if(ex) ex.onclick = ()=> exportData(true);
  const br = document.getElementById("bkRemind");
  if(br) br.onchange = ()=>{ state.backupReminder = br.checked; save(); toast(br.checked?"已開啟每週備份提醒":"已關閉備份提醒"); };
  const skT = document.getElementById("btnSkillToggle");
  if(skT) skT.onclick = ()=>{
    state.skillsOff = !state.skillsOff;
    save(); render(); toast(skillsEnabled()?"技能樹已開啟":"技能樹已關閉(SP 保留)");
  };
  const skRA = document.getElementById("btnSkillResetAll");
  if(skRA) skRA.onclick = ()=>{
    if(confirm("退還全班所有已投入的 SP,並清空所有技能?")){
      state.students.forEach(s=>{ s.spPoints += spSpent(s); s.skills = {}; });
      save(); render(); toast("全班技能已重置");
    }
  };
  app.querySelectorAll("[data-skreset]").forEach(b=> b.onclick = ()=>{
    const s = stu(b.dataset.skreset); if(!s) return;
    if(confirm("退還 "+s.name+" 的 SP 並清空其技能?")){
      s.spPoints += spSpent(s); s.skills = {};
      save(); render(); toast(s.name+" 技能已重置");
    }
  });
  const fi = document.getElementById("fileImport"); if(fi) fi.onchange = ()=>{ if(fi.files[0]) importData(fi.files[0]); };
  const wipe = document.getElementById("btnWipe");
  if(wipe) wipe.onclick = ()=>{
    modalConfirm("重置所有資料?\n建議先匯出備份。此動作無法復原。", ()=>{
      state = backfill(freshState()); save(); render(); toast("已重置");
    }, "確定重置");
  };
  const copyCode=document.getElementById("copyClassCode");
  if(copyCode) copyCode.onclick=async()=>{try{await navigator.clipboard.writeText(CLOUD.cid);toast("班級代碼已複製："+CLOUD.cid);}catch(_){prompt("請複製班級代碼",CLOUD.cid);}};
  const classQrBtn=document.getElementById("openClassQrBtn"); if(classQrBtn) classQrBtn.onclick=openQrModal;
  const nsAdd = document.getElementById("nsAdd");
  if(nsAdd) nsAdd.onclick = async()=>{
    const name = document.getElementById("nsName").value.trim();
    const sno = (document.getElementById("nsSno")?document.getElementById("nsSno").value:"").trim();
    const seat = (document.getElementById("nsSeat")?document.getElementById("nsSeat").value:"").trim();
    const email = (document.getElementById("nsEmail")?document.getElementById("nsEmail").value:"").trim().toLowerCase();
    const birth = (document.getElementById("nsBirth")?document.getElementById("nsBirth").value:"").trim();
    if(!name){ toast("請輸入姓名", true); return; }
    if(!sno){ toast("請輸入學號(家長查看與識別用,不可重複)", true); return; }
    if(!seat){ toast("請輸入班級座號", true); return; }
    if(state.students.some(x=>String(x.sno||"")===sno)){ toast("學號 "+sno+" 已存在,請確認", true); return; }
    if(state.students.some(x=>String(x.seat||x.sno||"")===seat)){ toast("座號 "+seat+" 已存在,請確認", true); return; }
    if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast("請輸入學生實際使用的 Google 信箱",true);return;}
    if(state.students.some(x=>String(x.email||x.registrationEmail||"").trim().toLowerCase()===email)){toast("這個 Google 信箱已綁定其他名冊角色",true);return;}
    if(birth&&!rosterBirthValid(birth)){toast("生日請填有效的西元 8 碼，例如 20130215",true);return;}
    const id = "S" + String(state.nextIdNum++).padStart(2,"0");
    if(!state.groups.includes(UNASSIGNED_GROUP))state.groups.unshift(UNASSIGNED_GROUP);
    const ns = newStudent(id, name, "Warrior", UNASSIGNED_GROUP);
    ns.sno=sno;ns.seat=seat;ns.email="";ns.registrationEmail=email;ns.birth=birth;ns.registrationComplete=false;ns.jobPending=true;ns.createdAt=Date.now();
    nsAdd.disabled=true;nsAdd.textContent="正在建立並同步…";
    try{
      if(CLOUD.on())await CLOUD.teacherCreateRosterStudent(ns);
      state.students.push(ns);
      addLog(id,"👩‍🏫 教師建立名冊並預先綁定 Google 信箱，等待學生完成選角");
      save();render();toast(name+" 已加入名冊；請使用 "+email+" 掃 QR 完成註冊");
    }catch(e){
      state.nextIdNum=Math.max(1,state.nextIdNum-1);nsAdd.disabled=false;nsAdd.textContent="建立名冊並預先綁定";
      toast("名冊建立失敗："+(e.message||e),true);
    }
  };
  const ase = document.getElementById("allowSelfEnroll");
  if(ase) ase.onchange = ()=>{ state.allowSelfEnroll = ase.checked; save(); toast(ase.checked?"學生可自行加入名冊":"僅限老師建立的名冊"); };
  app.querySelectorAll("[data-rosterbind]").forEach(b=>{
    b.onclick=async()=>{
      const st=stu(b.dataset.rosterbind);if(!st)return;
      const email=String(st.email||st.registrationEmail||"").trim().toLowerCase(),sno=String(st.sno||"").trim(),seat=String(st.seat||"").trim();
      if(!sno||!seat||!email){toast("請先填完整學號、座號與 Google 信箱",true);return;}
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast("學生 Google 信箱格式不正確",true);return;}
      if(state.students.some(x=>x.id!==st.id&&String(x.email||x.registrationEmail||"").trim().toLowerCase()===email)){toast("這個 Google 信箱已綁定其他名冊角色",true);return;}
      b.disabled=true;b.textContent="同步中…";
      try{await CLOUD.teacherCreateRosterStudent(st);toast("已同步 "+st.name+" 的註冊名冊；請學生使用 "+email+" 掃 QR 登入");}
      catch(e){b.disabled=false;b.textContent="同步綁定";toast("同步綁定失敗："+(e.message||e),true);}
    };
  });
  app.querySelectorAll("[data-unbind]").forEach(b=>{
    b.onclick = async()=>{
      const st = stu(b.dataset.unbind); if(!st) return;
      if(!confirm("解除「"+st.name+"」的帳號綁定?\n該生下次登入需重新認領角色(角色資料不會遺失)。")) return;
      st.email="";st.registrationEmail="";st.registrationComplete=false;
      if(CLOUD.on()){ FB.db.collection("classes").doc(CLOUD.cid).collection("students").doc(st.id).set(JSON.parse(JSON.stringify(st))).catch(()=>{}); }
      if(CLOUD.on())await CLOUD.unbindStudent(st).catch(e=>toast("帳號索引解除失敗："+(e.message||e),true));
      save(); render(); toast("已解除 "+st.name+" 的綁定");
    };
  });
  // ── 批次匯入 ──
  app.querySelectorAll("[data-mentor]").forEach(sel=>{
    sel.onchange = ()=>{
      const st = stu(sel.dataset.mentor); if(!st) return;
      st.mentorTier = +sel.value || 1;
      save(); toast(st.name+" 的指導金幣倍率：×"+st.mentorTier);
    };
  });
  app.querySelectorAll("[data-gleader]").forEach(sel=>{
    sel.onchange = ()=>{
      const g = sel.dataset.gleader;
      if(sel.value) state.groupLeaders[g] = sel.value;
      else delete state.groupLeaders[g];
      save(); toast(sel.value ? "👑 "+g+" 組組長:"+(stu(sel.value)||{}).name : g+" 組組長已清除");
    };
  });
  // 平時成績結算
  const gTS = document.getElementById("gTermStart");
  if(gTS) gTS.onclick = ()=>{
    if(!confirm("開始新計分週期?\n將以「現在」為起點重新累計每人 XP(舊週期數字請先匯出)。")) return;
    state.students.forEach(st=>{ st.termStartXp = st.totalXp||0; });
    state.termInfo.startDate = new Date().toLocaleDateString("zh-TW");
    view.gradePreview = false;
    save(); render(); toast("新計分週期已開始");
  };
  const gPv = document.getElementById("gPreview");
  if(gPv) gPv.onclick = ()=>{
    state.termInfo.target = Math.max(50, +document.getElementById("gTarget").value||500);
    state.termInfo.minScore = Math.min(100, Math.max(0, +document.getElementById("gMin").value||60));
    state.termInfo.maxScore = Math.min(100, Math.max(state.termInfo.minScore, +document.getElementById("gMax").value||100));
    view.gradePreview = true;
    save(); render();
  };
  const gCv = document.getElementById("gCsv");
  if(gCv) gCv.onclick = gradeCsvDownload;
  const rosterFile=document.getElementById("studentRosterFile");
  if(rosterFile)rosterFile.onchange=()=>{const file=rosterFile.files&&rosterFile.files[0];if(file)previewStudentRosterFile(file);rosterFile.value="";};
  const bulkBtn = document.getElementById("bulkImport");
  if(bulkBtn) bulkBtn.onclick = ()=>{
    const raw = (document.getElementById("bulkText").value||"").trim();
    if(!raw){ toast("請先貼上名冊", true); return; }
    const rows=raw.split(/\r?\n/).map(line=>line.split(/[\t,]/));
    openStudentRosterPreview(parseStudentRosterRows(rows,false),"貼上的名冊資料");
  };
  app.querySelectorAll("[data-gchange]").forEach(sel=>{
    sel.onchange = ()=>{ const s=stu(sel.dataset.gchange); if(s){ s.group=sel.value; reconcileLeadersCastle(); save(); render(); } };
  });
  app.querySelectorAll("[data-del]").forEach(b=>{
    b.onclick = ()=>{
      const s = stu(b.dataset.del); if(!s) return;
      if(confirm("移除 "+s.name+"?其資料會刪除(建議先匯出備份)。")){
        state.students = state.students.filter(x=>x.id!==s.id);
        reconcileLeadersCastle();
        save(); render();
      }
    };
  });
  const ngAdd = document.getElementById("ngAdd");
  if(ngAdd) ngAdd.onclick = ()=>{
    const g = document.getElementById("ngName").value.trim();
    if(!g){ toast("請輸入組名", true); return; }
    if(state.groups.includes(g)){ toast("組名已存在", true); return; }
    state.groups.push(g); save(); render();
  };
  app.querySelectorAll("[data-gdel]").forEach(b=>{
    b.onclick = ()=>{
      const g = b.dataset.gdel;
      if(state.groups.length<=1){ toast("至少要保留一個組", true); return; }
      if(!confirm("刪除「"+g+"」組?組內學生會移到「"+state.groups.find(x=>x!==g)+"」組。")) return;
      const fallback = state.groups.find(x=>x!==g);
      state.students.forEach(s=>{ if(s.group===g) s.group=fallback; });
      state.groups = state.groups.filter(x=>x!==g);
      if(state.groupLeaders[g]) delete state.groupLeaders[g];   // 該組組長卸任
      reconcileLeadersCastle();
      save(); render();
    };
  });
  const tkTierSel = document.getElementById("tkTier");
  const tkScopeSel = document.getElementById("tkScope");
  const tkReviewSel = document.getElementById("tkReviewMode");
  const refreshTaskDraftPreview = ()=>{
    const tiered=tkTierSel && tkTierSel.value==="tiered";
    const tierRow=document.getElementById("tierRow");
    const pickRow=document.getElementById("pickRow");
    if(tierRow) tierRow.style.display=tiered ? "grid" : "none";
    if(pickRow) pickRow.style.display=tkScopeSel && tkScopeSel.value==="pick" ? "" : "none";
    const reviewMode=tkReviewSel?.value||"teacher", autoConfig=document.getElementById("taskAutoConfig"), leaderConfig=document.getElementById("taskLeaderConfig");
    if(autoConfig) autoConfig.style.display=reviewMode==="auto"?"grid":"none";
    if(leaderConfig) leaderConfig.style.display=reviewMode==="leader"?"grid":"none";
    const picked=[...app.querySelectorAll(".tkPick")].filter(c=>c.checked);
    const pickCount=document.getElementById("taskPickCount");
    if(pickCount) pickCount.textContent="已選 "+picked.length+" 人";
    const title=(document.getElementById("tkTitle")?.value||"").trim() || "未命名任務";
    const catKey=document.getElementById("tkCategory")?.value || "lesson";
    const cat=TASK_CATEGORIES[catKey] || TASK_CATEGORIES.lesson;
    const scope=tkScopeSel?.value || "all";
    const scopeText=scope==="all" ? "全班" : (scope==="pick" ? picked.length+" 位指定學生" : scope+" 組");
    const n=id=>Math.max(0, +(document.getElementById(id)?.value||0));
    const rewards=tiered
      ? TIER_NAMES.map((name,i)=>TIER_ICONS[i]+name+" "+n(i?"tkXp"+(i+1):"tkXp")+"XP／"+n(i?"tkGold"+(i+1):"tkGold")+"金").join("　")
      : n("tkXp")+"XP／"+n("tkGold")+"金";
    const titleReward=(document.getElementById("tkTitleReward")?.value||"").trim();
    let reviewText=TASK_REVIEW_MODES[reviewMode].icon+TASK_REVIEW_MODES[reviewMode].name;
    if(reviewMode==="auto"){
      const rule=document.getElementById("tkAutoRule")?.value||"level", target=Math.max(1,+(document.getElementById("tkAutoTarget")?.value||1));
      reviewText+="・"+TASK_AUTO_RULES[rule].name+"達 "+target+TASK_AUTO_RULES[rule].unit;
    }else if(reviewMode==="leader") reviewText+="・"+(document.getElementById("tkLeaderDelay")?.value||24)+" 小時後開放";
    const preview=document.getElementById("taskDraftPreview");
    if(preview) preview.innerHTML='<b>👁 發布預覽｜'+cat.icon+' '+esc(title)+'</b><span>'+esc(scopeText)+'・'+(tiered?'差異化三層任務':'單一難度任務')+'</span><span>🔎 '+esc(reviewText)+'</span><span>🎁 '+esc(rewards)+(titleReward?'・稱號【'+esc(titleReward)+'】':'')+'</span>';
  };
  if(tkTierSel) tkTierSel.onchange=()=>{
    if(tkReviewSel?.value==="auto" && tkTierSel.value==="tiered"){
      tkTierSel.value="single"; toast("系統自動驗證使用單一難度；差異化三層請改用教師或組長審核",true);
    }
    refreshTaskDraftPreview();
  };
  if(tkScopeSel) tkScopeSel.onchange=refreshTaskDraftPreview;
  if(tkReviewSel) tkReviewSel.onchange=()=>{
    if(tkReviewSel.value==="auto" && tkTierSel?.value==="tiered") tkTierSel.value="single";
    refreshTaskDraftPreview();
  };
  const pAll = document.getElementById("pickAll");
  if(pAll) pAll.onclick = (e)=>{ e.preventDefault(); app.querySelectorAll(".tkPick").forEach(c=>c.checked=true); refreshTaskDraftPreview(); };
  const pNone = document.getElementById("pickNone");
  if(pNone) pNone.onclick = (e)=>{ e.preventDefault(); app.querySelectorAll(".tkPick").forEach(c=>c.checked=false); refreshTaskDraftPreview(); };
  app.querySelectorAll("[data-tpickgroup]").forEach(b=> b.onclick=(e)=>{
    e.preventDefault();
    const members=[...app.querySelectorAll(".tkPick")].filter(c=>c.dataset.group===b.dataset.tpickgroup);
    const mark=!members.length || members.some(c=>!c.checked);
    members.forEach(c=>c.checked=mark);
    refreshTaskDraftPreview();
  });
  ["tkTitle","tkCategory","tkTitleReward","tkXp","tkGold","tkXp2","tkGold2","tkXp3","tkGold3","tkAutoRule","tkAutoTarget","tkLeaderDelay"].forEach(id=>{
    const el=document.getElementById(id);
    if(el){ el.oninput=refreshTaskDraftPreview; el.onchange=refreshTaskDraftPreview; }
  });
  app.querySelectorAll(".tkPick").forEach(c=>c.onchange=refreshTaskDraftPreview);
  refreshTaskDraftPreview();
  const dungeonVolume=document.getElementById("dungeonTaskVolume"),refreshDungeonBank=()=>{
    const vol=String(dungeonVolume?.value||"1"),grade=Number(vol)<=2?"七年級":Number(vol)<=4?"八年級":"九年級";app.querySelectorAll("[data-dungeon-vol]").forEach(x=>x.hidden=String(x.dataset.dungeonVol)!==vol||String(x.dataset.dungeonGrade||"")!==grade);
    const selected=[...app.querySelectorAll(".tkDungeonBank")].filter(x=>x.checked).length,count=document.getElementById("dungeonBankCount");if(count)count.textContent=selected?"已勾選 "+selected+" 個課程主題；將追加地下城同單元題型":"未勾選時使用地下城內建題庫";
  };
  if(dungeonVolume)dungeonVolume.onchange=refreshDungeonBank;
  app.querySelectorAll(".tkDungeonBank").forEach(x=>x.onchange=refreshDungeonBank);
  const dungeonBankAll=document.getElementById("dungeonBankAll");if(dungeonBankAll)dungeonBankAll.onclick=()=>{app.querySelectorAll("[data-dungeon-vol]:not([hidden]) .tkDungeonBank").forEach(x=>x.checked=true);refreshDungeonBank();};
  const dungeonBankNone=document.getElementById("dungeonBankNone");if(dungeonBankNone)dungeonBankNone.onclick=()=>{app.querySelectorAll(".tkDungeonBank").forEach(x=>x.checked=false);refreshDungeonBank();};
  refreshDungeonBank();
  const dungeonTaskPublish=document.getElementById("dungeonTaskPublish");if(dungeonTaskPublish)dungeonTaskPublish.onclick=()=>{
    const title=(document.getElementById("dungeonTaskTitle")?.value||"").trim();if(!title){toast("請輸入作業名稱",true);return;}
    const volume=String(dungeonVolume?.value||"1"),target=Math.max(3,Math.min(100,Number(document.getElementById("dungeonTaskTarget")?.value)||10)),xp=Math.max(0,Math.min(500,Number(document.getElementById("dungeonTaskXp")?.value)||0)),gold=Math.max(0,Math.min(1000,Number(document.getElementById("dungeonTaskGold")?.value)||0)),scope=document.getElementById("dungeonTaskScope")?.value||"all";
    const selected=[...app.querySelectorAll(".tkDungeonBank:checked")].map(x=>Number(x.value)).filter(Number.isFinite),bank=[];
    const expectedGrade=Number(volume)<=2?"七年級":Number(volume)<=4?"八年級":"九年級";
    selected.forEach(i=>{const row=lessonQuestionBank()[i];if(!row||String(row.vol)!==volume||String(row.grade||"")!==expectedGrade)return;(row.qs||[]).forEach(q=>{const opts=(q.opts||[]).slice(0,4);while(opts.length<4)opts.push("");let ans=String(q.ans||"");if(!opts.includes(ans)){const ai="ABCD".indexOf(ans.toUpperCase());ans=opts[Math.max(0,ai)]||opts[0];}bank.push({q:String(q.q||"").slice(0,500),opts:opts.map(x=>String(x).slice(0,220)),ans,sol:String(q.sol||"").slice(0,500),chap:String(row.chap||"").slice(0,80),unit:String(row.unit||"").slice(0,80),topic:String(row.topic||row.unit||"課程目錄題庫").slice(0,80),source:row.custom?"teacher":"course",grade:expectedGrade,vol:Number(volume),questionImage:quizImageSrc(q.questionImage),optionImages:(q.optionImages||[]).slice(0,4).map(quizImageSrc)});});});
    const trimmed=bank.slice(0,80);if(JSON.stringify(trimmed).length>160000){toast("勾選的圖片題容量過大，請減少單元或壓縮圖片（本次上限約 160KB）",true);return;}
    const nt=createTask(title,xp,gold,scope);nt.category="homework";nt.reviewMode="teacher";nt.autoRule="dungeonQuestions";nt.autoTarget=target;nt.dungeonHomework=true;nt.dungeonVolume=Number(volume);nt.dungeonBank=trimmed;nt.autoStartValues={};state.students.filter(x=>scope==="all"||x.group===scope).forEach(x=>nt.autoStartValues[x.id]=taskAutoValue(x,"dungeonQuestions"));
    addLog("-","🏰 發布地下城作業「"+title+"」：第 "+volume+" 冊、"+(trimmed.length?"課程目錄 "+trimmed.length+" 題＋地下城同單元題型":"地下城內建題庫"));save();render();toast("🏰 地下城作業已發布");
  };
  const tkAdd = document.getElementById("tkAdd");
  if(tkAdd) tkAdd.onclick = ()=>{
    const title = document.getElementById("tkTitle").value.trim();
    if(!title){ toast("請輸入任務名稱", true); return; }
    const x = Math.max(0, +document.getElementById("tkXp").value || 0);
    const g = Math.max(0, +document.getElementById("tkGold").value || 0);
    if(x===0 && g===0){ toast("XP 和金幣至少填一項", true); return; }
    const tr = (document.getElementById("tkTitleReward")?document.getElementById("tkTitleReward").value:"").trim();
    let scopeVal = document.getElementById("tkScope").value;
    if(scopeVal==="pick"){
      const picked = [...app.querySelectorAll(".tkPick")].filter(c=>c.checked).map(c=>c.value);
      if(!picked.length){ toast("請至少勾選一位學生", true); return; }
      scopeVal = "stu:" + picked.join(",");
    }
    const nt = createTask(title, x, g, scopeVal);
    if(nt){ const cat=document.getElementById("tkCategory"); nt.category=(cat&&TASK_CATEGORIES[cat.value])?cat.value:"lesson"; }
    if(nt){
      nt.reviewMode=tkReviewSel?.value||"teacher";
      nt.autoRule=document.getElementById("tkAutoRule")?.value||"level";
      nt.autoTarget=Math.max(1,+(document.getElementById("tkAutoTarget")?.value||1));
      nt.leaderDelayHours=Math.max(0,+(document.getElementById("tkLeaderDelay")?.value||24));
    }
    if(nt && tr) nt.titleReward = tr;
    if(nt && document.getElementById("tkTier") && document.getElementById("tkTier").value==="tiered"){
      const x2=+document.getElementById("tkXp2").value||0, g2=+document.getElementById("tkGold2").value||0;
      const x3=+document.getElementById("tkXp3").value||0, g3=+document.getElementById("tkGold3").value||0;
      nt.tiers = [{name:TIER_NAMES[0],xp:x,gold:g},{name:TIER_NAMES[1],xp:x2,gold:g2},{name:TIER_NAMES[2],xp:x3,gold:g3}];
    }
    save(); render(); toast("任務已發布"+(tr?"(通過可獲稱號【"+tr+"】)":""));
  };
  app.querySelectorAll("[data-approve]").forEach(b=> b.onclick = async()=>{
    const [t,s] = b.dataset.approve.split("|"); b.disabled=true;await approveSubmission(+t, s);
  });
  app.querySelectorAll("[data-reject]").forEach(b=> b.onclick = ()=>{
    const [t,s] = b.dataset.reject.split("|"); rejectSubmission(+t, s);
  });
  const refreshTaskBatchSelection=()=>{
    const all=[...app.querySelectorAll(".task-review-check")], selected=all.filter(c=>c.checked).length;
    app.querySelectorAll(".task-selected-count").forEach(el=>el.textContent="已選 "+selected+" 件");
    app.querySelectorAll("[data-task-bulk-approve]").forEach(btn=>btn.disabled=selected===0);
  };
  app.querySelectorAll(".task-review-check").forEach(c=>c.onchange=refreshTaskBatchSelection);
  app.querySelectorAll("[data-taskselect]").forEach(b=>b.onclick=()=>{
    const checked=b.dataset.taskselect==="all";
    app.querySelectorAll(".task-review-check").forEach(c=>c.checked=checked);
    refreshTaskBatchSelection();
  });
  app.querySelectorAll("[data-task-bulk-approve]").forEach(b=>b.onclick=async()=>{
    const selected=[...app.querySelectorAll(".task-review-check")].filter(c=>c.checked).map(c=>c.value.split("|"));
    if(!selected.length){ toast("請先勾選要通過的任務",true); return; }
    if(!confirm("確定一次通過已勾選的 "+selected.length+" 件任務並發放獎勵？")) return;
    let passed=0;b.disabled=true;
    for(const [taskId,sid] of selected){if(await approveSubmission(+taskId,sid,{type:"teacher",id:"teacher",name:"教師",batch:true}))passed++;}
    save(); render(); toast("✅ 已批次通過 "+passed+" 件任務");
  });
  refreshTaskBatchSelection();
  app.querySelectorAll("[data-ttoggle]").forEach(b=> b.onclick = ()=>{
    const t = taskById(+b.dataset.ttoggle); if(t){ t.active=!t.active; save(); render(); }
  });
  app.querySelectorAll("[data-taskdel]").forEach(b=> b.onclick = ()=>{
    const t = taskById(+b.dataset.taskdel); if(!t) return;
    if(confirm("刪除任務「"+t.title+"」?相關回報紀錄也會一併移除。")){
      state.tasks = state.tasks.filter(x=>x.id!==t.id);
      state.submissions = state.submissions.filter(x=>x.taskId!==t.id);
      save(); render();
    }
  });
  const bsStart = document.getElementById("bsStart");
  if(bsStart) bsStart.onclick = ()=>{
    const name = document.getElementById("bsName").value.trim() || "神秘魔王";
    const hp = Math.max(50, +document.getElementById("bsHp").value || 500);
    const x = Math.max(0, +document.getElementById("bsXp").value || 0);
    const g = Math.max(0, +document.getElementById("bsGold").value || 0);
    startBoss(name, hp, x, g); render();
  };
  const bsGA = document.getElementById("bsGroupAtk");
  if(bsGA) bsGA.onclick = groupAttackTurn;
  bindFloatConsole();
  // 名冊:座號/生日/信箱編輯
  app.querySelectorAll("[data-seat]").forEach(inp=>{ inp.onchange = ()=>{ const s=stu(inp.dataset.seat); if(s){ s.seat=inp.value.trim(); save(); if(CLOUD.on()&&CLOUD.role==="teacher")CLOUD.syncEnrollments(true).catch(e=>toast("註冊名冊索引同步失敗："+(e.message||e),true)); } }; });
  app.querySelectorAll("[data-sno]").forEach(inp=>{ inp.onchange = ()=>{ const s=stu(inp.dataset.sno); if(!s) return; const v=inp.value.trim(); if(v && state.students.some(x=>x.id!==s.id && String(x.sno||"")===v)){ toast("學號 "+v+" 已被其他學生使用", true); inp.value=s.sno||""; return; } s.sno=v; save(); if(CLOUD.on()&&CLOUD.role==="teacher")CLOUD.syncEnrollments(true).catch(e=>toast("註冊名冊索引同步失敗："+(e.message||e),true)); } });
  app.querySelectorAll("[data-birth]").forEach(inp=>{inp.onchange=()=>{const s=stu(inp.dataset.birth);if(!s)return;const v=inp.value.trim();if(v&&!rosterBirthValid(v)){toast("生日請填有效的西元 8 碼，例如 20130215",true);inp.value=s.birth||"";return;}s.birth=v;save();};});
  app.querySelectorAll("[data-email]").forEach(inp=>{inp.onchange=()=>{const s=stu(inp.dataset.email);if(!s)return;const old=String(s.email||s.registrationEmail||"").trim().toLowerCase(),v=inp.value.trim().toLowerCase();if(v&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){toast("學生信箱格式不正確",true);inp.value=old;return;}if(v&&state.students.some(x=>x.id!==s.id&&String(x.email||x.registrationEmail||"").trim().toLowerCase()===v)){toast("這個 Google 信箱已綁定其他名冊角色",true);inp.value=old;return;}if(v!==old){s.registrationComplete=false;s.email="";s.registrationEmail=v;}if(!v){s.email="";s.registrationEmail="";}save();if(CLOUD.on()&&CLOUD.role==="teacher")CLOUD.syncEnrollments(true).catch(e=>toast("註冊名冊同步失敗："+(e.message||e),true));toast(v?"信箱已存入待註冊名冊；請按『同步綁定』後再讓學生掃 QR 完成最後確認":"信箱已清空");};});
  // 教師白名單
  const twBtn = document.getElementById("twAddBtn");
  if(twBtn) twBtn.onclick = ()=>{
    const v=(document.getElementById("twAdd").value||"").trim().toLowerCase();
    if(!v || !v.includes("@")){ toast("請輸入有效信箱", true); return; }
    if(!state.teacherEmails) state.teacherEmails=[];
    if(state.teacherEmails.includes(v)){ toast("已在白名單"); return; }
    state.teacherEmails.push(v); save(); render();
  };
  app.querySelectorAll("[data-tdel]").forEach(b=>{
    b.onclick = ()=>{
      if(state.teacherEmails.length<=1){ toast("至少保留一位教師,避免被鎖在門外", true); return; }
      if(!confirm("移除教師 "+state.teacherEmails[+b.dataset.tdel]+"?")) return;
      state.teacherEmails.splice(+b.dataset.tdel,1); save(); render();
    };
  });
  // 班級連結+排行榜
  const cpy = document.getElementById("copyLink");
  if(cpy) cpy.onclick = ()=>{
    const inp = document.getElementById("classLink"); inp.select();
    try{ navigator.clipboard.writeText(inp.value).then(()=>toast("已複製班級連結")); }
    catch(e){ document.execCommand("copy"); toast("已複製"); }
  };
  const lbT = document.getElementById("lbToggle");
  if(lbT) lbT.onclick = ()=>{
    if(!classFeatureUnlocked("world")){toast("🔒 "+classFeatureLockText("world"),true);return;}
    state.lbOptIn = !state.lbOptIn;
    const nm = document.getElementById("lbName"); if(nm) state.lbName = nm.value.trim();
    if(state.lbOptIn && !state.lbName){ toast("請先填上榜暱稱", true); state.lbOptIn=false; return; }
    save(); CLOUD._lbLast=0; CLOUD.pushLeaderboard().catch(()=>{}); render();
  };
  const lbN = document.getElementById("lbName");
  if(lbN) lbN.onchange = ()=>{ state.lbName = lbN.value.trim(); save(); };
  const lbV = document.getElementById("lbView");
  if(lbV) lbV.onclick = showLeaderboard;
  const tRW = document.getElementById("tRankWorld");
  if(tRW) tRW.onclick = showLeaderboard;
  app.querySelectorAll("[data-revaward]").forEach(b=>{
    b.onclick = ()=>{
      const lg = (state.awardLog||[]).find(x=>x.id===b.dataset.revaward);
      if(!lg) return;
      const s = stu(lg.sid);
      if(confirm("撤回 "+(s?s.name:"?")+" 的「"+lg.reason+"」(-"+lg.xp+"XP -"+lg.gold+"金)?")) reverseAward(lg.id);
    };
  });
  // 競技場
  if(ARENA.active && view.tview!=="arena"){ arenaStop(); }   // 換分頁自動結束
  const arS = document.getElementById("arStart");
  if(arS) arS.onclick = ()=>{
    arenaStart(document.getElementById("arA").value, document.getElementById("arB").value,
      document.getElementById("arFriendly").checked);
  };
  const arP = document.getElementById("arPause");
  if(arP) arP.onclick = ()=>{
    if(ARENA.timer){ clearInterval(ARENA.timer); ARENA.timer=null; arP.textContent="▶ 繼續"; }
    else if(!ARENA.over){ ARENA.timer=setInterval(arenaTick,50); arP.textContent="⏸ 暫停"; }
  };
  const arSp = document.getElementById("arSpeed");
  if(arSp) arSp.onclick = ()=>{ ARENA.speed = ARENA.speed>=4 ? 1 : ARENA.speed*2; arSp.textContent="⏩ 速度 x"+ARENA.speed; };
  const arQ = document.getElementById("arQuit");
  if(arQ) arQ.onclick = ()=>{ arenaStop(); ARENA.over=false; render(); };
  // 團體戰
  if(GARENA.active && view.tview!=="arena" && !GARENA.autoSim){ garenaStop(); }   // 📼 週五自動賽(背景快速模擬)豁免
  const csA = document.getElementById("csAdd");
  if(csA) csA.onclick = ()=>{
    state.castleShopItems.push({key:"c"+Date.now(), icon:"🎫", name:"新道具卡", desc:"說明", price:10});
    save(); render();
  };
  const csS = document.getElementById("csSave");
  if(csS) csS.onclick = ()=>{
    app.querySelectorAll("[data-csi]").forEach(inp=>{ state.castleShopItems[+inp.dataset.csi].icon = inp.value.trim()||"🎫"; });
    app.querySelectorAll("[data-csn]").forEach(inp=>{ state.castleShopItems[+inp.dataset.csn].name = inp.value.trim()||"道具卡"; });
    app.querySelectorAll("[data-csd]").forEach(inp=>{ state.castleShopItems[+inp.dataset.csd].desc = inp.value.trim(); });
    app.querySelectorAll("[data-csp]").forEach(inp=>{ state.castleShopItems[+inp.dataset.csp].price = Math.max(1,+inp.value||1); });
    save(); render(); toast("城堡商店已更新");
  };
  app.querySelectorAll("[data-csdel]").forEach(b=> b.onclick = ()=>{
    if(!confirm("刪除「"+state.castleShopItems[+b.dataset.csdel].name+"」?")) return;
    state.castleShopItems.splice(+b.dataset.csdel,1); save(); render();
  });
  app.querySelectorAll("[data-csdone]").forEach(b=> b.onclick = ()=>{
    const lg = (state.realItemLog||[]).find(x=>x.id===b.dataset.csdone);
    if(lg){ lg.done = true; save(); render(); toast("已標記執行:"+lg.itemName); }
  });
  app.querySelectorAll("[data-rnok]").forEach(b=> b.onclick = ()=>{        // 📝 改名通過
    const r = (state.renameReq||[]).find(x=>x.id===b.dataset.rnok && x.status==="pending");
    if(!r) return;
    const st2 = stu(r.sid); if(!st2){ r.status = "rejected"; save(); render(); return; }
    const old = st2.name; st2.name = r.newName; r.status = "approved";
    addLog(r.sid, "📝 改名通過:「"+old+"」→「"+st2.name+"」");
    save(); render(); toast("✓ 已改名:"+old+" → "+st2.name);
  });
  app.querySelectorAll("[data-rvsub]").forEach(b=> b.onclick = async()=>{       // ✅ 任務批改
    const [sid, taskId, act] = b.dataset.rvsub.split("|");
    if(act==="ok") await approveSubmission(taskId, sid); else rejectSubmission(taskId, sid);
    save(); render();
  });
  app.querySelectorAll("[data-helpdone]").forEach(b=>b.onclick=async()=>{
    const h=(state.helpRequests||[]).find(x=>String(x.id)===String(b.dataset.helpdone));if(!h)return;
    b.disabled=true;
    try{if(CLOUD.on())await CLOUD.resolveHelpRequest(h.id);h.status="resolved";h.resolvedAtMs=Date.now();save();toast("已標記完成私下關心");render();}
    catch(e){b.disabled=false;toast("求助狀態同步失敗："+(e.message||e),true);}
  });
  app.querySelectorAll("[data-rvds]").forEach(b=> b.onclick = ()=>{        // ✅ 工坊上架
    const [idStr, act] = b.dataset.rvds.split("|");
    const id = isNaN(+idStr) ? idStr : +idStr;                              // 🔧 id 轉回數字(customItems.id 是數字)
    if(act==="ok"){ const c = state.customItems.find(x=>x.id===id); if(c){ approveDesign(id, c.suggestPrice||c.price||60, {itemLevel:itemLevelOf(c),atk:c.atk||0,def:c.def||0,agi:c.agi||0,int:c.int||0}); } }
    else rejectDesign(id);
    save(); render();
  });
  app.querySelectorAll("[data-rnno]").forEach(b=> b.onclick = ()=>{        // 📝 改名退回+退卡
    const r = (state.renameReq||[]).find(x=>x.id===b.dataset.rnno && x.status==="pending");
    if(!r) return;
    r.status = "rejected";
    const st2 = stu(r.sid);
    if(st2){ st2.consumables = st2.consumables||{}; st2.consumables[35] = (st2.consumables[35]||0)+1;
      addLog(r.sid, "📝 改名申請被退回,改名卡已退回背包"); }
    save(); render(); toast("已退回改名申請(卡片退還)");
  });
  const sgF = document.getElementById("siegeForce");
  if(sgF) sgF.onclick = ()=>{
    state.siege.forceDate = new Date().toLocaleDateString("sv");
    sfx("goal");
    save(); render(); toast("🏰 今日公會戰已開啟!");
  };
  app.querySelectorAll("[data-siegejoin]").forEach(b=>{
    b.onclick = ()=>{
      const g = b.dataset.siegejoin;
      const lid = state.groupLeaders[g]; const leader = stu(lid);
      if(leader && !leader.consumables) leader.consumables = {};
      if(!leader || !(leader.consumables[31]>0)){ toast("組長沒有攻城卷", true); return; }
      leader.consumables[31]--;                                 // 🎫 報名即消耗一張(循環賽多場不再重複扣)
      if(leader.consumables[31] <= 0) delete leader.consumables[31];
      siegeEntriesToday().push({group:g, leaderId:lid, date:new Date().toLocaleDateString("sv"), week:lbWeekKey()});   // 攜帶制+週報名(週五 20:00 自動開打)
      addLog(lid, "🏰 消耗一張攻城卷,為 "+g+" 組報名公會戰!(本週循環賽所有場次通行)");
      save(); render(); toast("🏰 "+g+" 組已報名(攻城卷已消耗,本週循環賽全場通行)");
    };
  });
  const trS = document.getElementById("tourStart");
  if(trS) trS.onclick = ()=>{
    const groups = siegeEntriesToday().map(e=>e.group);
    if(groups.length<3){ toast("循環賽需要至少三組", true); return; }
    tourStart(groups);
    addLog("-","🏆 公會戰積分循環賽開始!"+groups.join("、")+" 共 "+(groups.length*(groups.length-1)/2)+" 場");
    save(); render(); toast("🏆 循環賽開始!依賽程逐場開打");
  };
  app.querySelectorAll("[data-tourgo]").forEach(b=> b.onclick = ()=>{
    const t = state.siege.tournament; if(!t) return;
    const m = t.matches[+b.dataset.tourgo];
    if(!m || m.done) return;
    // 報名時已扣券；賽程中的每一戰直接使用當週報名資格，不再要求組長背包仍有券。
    const red = state.students.filter(x=>x.group===m.red).map(x=>x.id);
    const blue = state.students.filter(x=>x.group===m.blue).map(x=>x.id);
    if(!red.length || !blue.length){ toast("有一組沒有成員", true); return; }
    GARENA.siege = true;
    GARENA.siegeTournament = true;
    GARENA.siegeTeams = { red:m.red, blue:m.blue };
    garenaStart(red, blue, !CLOUD.on());
    garenaLog("🏆 循環賽:"+m.red+" 組 vs "+m.blue+" 組!");
  });
  const trA = document.getElementById("tourAbort");
  if(trA) trA.onclick = ()=>{
    if(!confirm("中止整個循環賽?已打場次的獎勵保留，但不會產生冠軍佔城；報名時已使用的攻城卷不退還。")) return;
    state.siege.tournament = null;
    addLog("-","🛑 老師中止了循環賽");
    save(); render();
  };
  const sgS = document.getElementById("siegeStart");
  const pkG = document.getElementById("peakGo");
  if(pkG) pkG.onclick = ()=>{ peakStart(document.getElementById("peakGrp").value); };
  app.querySelectorAll("[data-replay]").forEach(b=> b.onclick = ()=>{ openReplay(+b.dataset.replay); });
  if(sgS) sgS.onclick = ()=>{
    const rg = document.getElementById("siegeRed").value;
    const bg = document.getElementById("siegeBlue").value;
    if(rg===bg){ toast("兩邊不能是同一組", true); return; }
    const red = state.students.filter(x=>x.group===rg).map(x=>x.id);
    const blue = state.students.filter(x=>x.group===bg).map(x=>x.id);
    if(!red.length || !blue.length){ toast("有一組沒有成員", true); return; }
    // 下拉選單只會列出已報名隊伍；報名時已扣券，開戰不再重複驗券。
    GARENA.siege = true;                                     // 公會戰旗標(獎勵加碼)
    GARENA.siegeTeams = { red:rg, blue:bg };                 // 佔城判定用
    garenaStart(red, blue, !CLOUD.on());                     // 離線→AI代打
    garenaLog("🏰 公會戰:"+rg+" 組 vs "+bg+" 組!");
  };
  // 🗺 戰場選擇
  app.querySelectorAll("[data-gamap]").forEach(b=> b.onclick = ()=>{
    const k = b.dataset.gamap;
    if(k === "__random"){
      const keys = Object.keys(BATTLE_MAPS).filter(k=>BATTLE_MAPS[k].mode!=="moba"&&mapUnlocked(k));
      GARENA.mapKey = keys[Math.floor(Math.random()*keys.length)];
      GARENA.warnCells = null;
      toast("🎲 隨機戰場:"+gaMap().icon+" "+gaMap().name);
    }else{
      if(!mapUnlocked(k)){
        const eb = Object.values(ELEM_BOSSES).find(x=>x.map===k);
        toast("🔒 此戰場尚未解鎖——先到「🐉 Boss 戰」擊敗「"+(eb?eb.icon+eb.name:"對應魔王")+"」!", true);
        return;
      }
      GARENA.mapKey = k;
      GARENA.warnCells = null;
      toast("🗺 戰場已選:"+gaMap().icon+" "+gaMap().name);
    }
    render();
  });
  const gaMapSelect=document.getElementById("gaMapSelect");
  if(gaMapSelect) gaMapSelect.onchange=()=>{
    const k=gaMapSelect.value;
    if(!mapUnlocked(k)){ toast("🔒 此戰場尚未解鎖",true); return; }
    GARENA.mapKey=k; GARENA.warnCells=null;
    toast("🗺 戰場已選:"+gaMap().icon+" "+gaMap().name);
    render();
  };
  const gaAi = document.getElementById("gaStartAi");
  if(gaAi) gaAi.onclick = ()=>{
    let red = [...app.querySelectorAll('.gaPick[data-team="red"]')].filter(c=>c.checked).map(c=>c.value);
    let blue = [...app.querySelectorAll('.gaPick[data-team="blue"]')].filter(c=>c.checked).map(c=>c.value);
    const dup = red.filter(id=>blue.includes(id));
    if(dup.length){ toast("同一人不能同時在兩隊", true); return; }
    if(!red.length && !blue.length){                          // 沒勾→自動抓前4人示範
      const ids = state.students.slice(0,4).map(x=>x.id);
      red = ids.filter((_,i)=>i%2===0); blue = ids.filter((_,i)=>i%2===1);
    }
    if(!red.length || !blue.length){ toast("兩隊都至少要一人", true); return; }
    garenaStart(red, blue, true);
    toast("🤖 AI 演練開始,純觀戰(仍會發放勝敗XP)");
  };
  // ⚡ 快速分隊
  const setPicks = (redIds, blueIds)=>{
    app.querySelectorAll('.gaPick').forEach(c=>{
      const t = c.dataset.team;
      c.checked = (t==="red" && redIds.includes(c.value)) || (t==="blue" && blueIds.includes(c.value));
    });
  };
  const qsR = document.getElementById("qsRandom");
  if(qsR) qsR.onclick = ()=>{
    const ids = state.students.map(x=>x.id);
    for(let i=ids.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [ids[i],ids[j]]=[ids[j],ids[i]]; }  // 洗牌
    const half = Math.ceil(ids.length/2);
    setPicks(ids.slice(0,half), ids.slice(half));
    toast("🎲 已隨機分隊:紅 "+half+" 人 / 藍 "+(ids.length-half)+" 人");
  };
  const qsC = document.getElementById("qsClear");
  if(qsC) qsC.onclick = ()=>{ setPicks([], []); };
  app.querySelectorAll("[data-qred]").forEach(b=> b.onclick = ()=>{
    const g = b.dataset.qred;
    const reds = state.students.filter(x=>x.group===g).map(x=>x.id);
    const blues = [...app.querySelectorAll('.gaPick[data-team="blue"]')].filter(c=>c.checked).map(c=>c.value).filter(id=>!reds.includes(id));
    setPicks(reds, blues);
    toast("🔴 紅隊 = "+g+"組("+reds.length+"人)");
  });
  app.querySelectorAll("[data-qblue]").forEach(b=> b.onclick = ()=>{
    const g = b.dataset.qblue;
    const blues = state.students.filter(x=>x.group===g).map(x=>x.id);
    const reds = [...app.querySelectorAll('.gaPick[data-team="red"]')].filter(c=>c.checked).map(c=>c.value).filter(id=>!blues.includes(id));
    setPicks(reds, blues);
    toast("🔵 藍隊 = "+g+"組("+blues.length+"人)");
  });
  const gaS = document.getElementById("gaStart");
  if(gaS) gaS.onclick = ()=>{
    const red = [...app.querySelectorAll('.gaPick[data-team="red"]')].filter(c=>c.checked).map(c=>c.value);
    const blue = [...app.querySelectorAll('.gaPick[data-team="blue"]')].filter(c=>c.checked).map(c=>c.value);
    const dup = red.filter(id=>blue.includes(id));
    if(dup.length){ toast("同一人不能同時在兩隊:"+dup.map(id=>(stu(id)||{}).name).join("、"), true); return; }
    if(!red.length || !blue.length){ toast("兩隊都至少要一人", true); return; }
    garenaStart(red, blue);
  };
  const startMoba=(ai,mode)=>{
    let red=[...app.querySelectorAll('.mobaPick[data-team="red"]')].filter(c=>c.checked).map(c=>c.value);
    let blue=[...app.querySelectorAll('.mobaPick[data-team="blue"]')].filter(c=>c.checked).map(c=>c.value);
    if(!red.length&&!blue.length&&ai){ const ids=state.students.slice(0,6).map(x=>x.id); red=ids.slice(0,3); blue=ids.slice(3,6); }
    const dup=red.filter(id=>blue.includes(id));
    if(dup.length){ toast("同一人不能同時加入紅藍兩隊",true); return; }
    if(red.length>MOBA_TEAM_MAX||blue.length>MOBA_TEAM_MAX){ toast("Dota 戰場每隊最多 "+MOBA_TEAM_MAX+" 名學生",true); return; }
    if(!red.length&&!blue.length){toast("至少選擇一名學生，或使用 AI 演練",true);return;}
    const filled=mobaFillAi(red,blue);
    const battleMode=mode==="mobaKnowledge"?"mobaKnowledge":"moba";garenaStart(filled.red,filled.blue,ai,battleMode);
    if(filled.red.some(id=>String(id).startsWith("MOBA_AI_"))||filled.blue.some(id=>String(id).startsWith("MOBA_AI_")))toast(filled.size+"v"+filled.size+" 開戰；不足隊員已補為 Lv."+filled.avg+" 隨機職業 AI");
    if(battleMode==="mobaKnowledge")setTimeout(openMobaKnowledgePicker,80);
  };
  const mobaStart=document.getElementById("mobaStart");
  if(mobaStart) mobaStart.onclick=()=>startMoba(!CLOUD.on());
  const mobaStartAi=document.getElementById("mobaStartAi");
  if(mobaStartAi) mobaStartAi.onclick=()=>startMoba(true);
  const mobaKnowledgeStart=document.getElementById("mobaKnowledgeStart");
  if(mobaKnowledgeStart)mobaKnowledgeStart.onclick=()=>startMoba(!CLOUD.on(),"mobaKnowledge");
  const mobaSignupOpen=document.getElementById("mobaSignupOpen");if(mobaSignupOpen)mobaSignupOpen.onclick=MOBA_SIGNUP.active?(CLOUD.on()?openMobaSignupQr:()=>openMobaSignupManager(false)):openMobaSignup;
  const mobaSignupManageInline=document.getElementById("mobaSignupManageInline");if(mobaSignupManageInline)mobaSignupManageInline.onclick=()=>openMobaSignupManager(false);
  const mobaQr=document.getElementById("mobaQr");if(mobaQr)mobaQr.onclick=openMobaJoinQr;
  const mobaBattleQr=document.getElementById("mobaBattleQr");if(mobaBattleQr)mobaBattleQr.onclick=openMobaJoinQr;
  const mobaQuizPick=document.getElementById("mobaQuizPick");if(mobaQuizPick)mobaQuizPick.onclick=openMobaKnowledgePicker;
  const gaP = document.getElementById("gaPause");
  if(gaP) gaP.onclick = ()=>{
    if(GARENA.paused){
      const pausedFor=Math.max(0,Date.now()-(GARENA.pausedAt||Date.now()));
      shiftRuntimeCooldowns('ga',pausedFor);
      Object.values(GARENA.fighters||{}).forEach(f=>{if(f.jobReadyAt)f.jobReadyAt+=pausedFor;if(f.advUltReadyAt)f.advUltReadyAt+=pausedFor;});
      GARENA.paused = false; gaP.textContent = "⏸ 暫停";
    }else{
      GARENA.paused = true; GARENA.pausedAt = Date.now(); gaP.textContent = "▶ 繼續";
    }
  };
  const gaSp = document.getElementById("gaSpeed");
  if(gaSp) gaSp.onclick = ()=> garenaSetSpeed((GARENA.speed||1)>=3?1:(GARENA.speed||1)+1);
  const gaQ = document.getElementById("gaQuit");
  if(gaQ) gaQ.onclick = ()=>{ garenaStop(); GARENA.over=false; GARENA.mvp=null; render(); };
  const gaResultClose=document.getElementById("gaResultClose");
  if(gaResultClose)gaResultClose.onclick=()=>{const ov=document.getElementById("gaResultOverlay");if(ov)ov.remove();};
  // 稱號設計:頒發
  app.querySelectorAll("[data-grant]").forEach(b=>{
    b.onclick = ()=>{
      const nm = b.dataset.grant;
      const sel = app.querySelector('[data-grantsel="'+nm.replace(/"/g,'\\"')+'"]');
      const st = sel ? stu(sel.value) : null;
      if(!st){ toast("請選擇學生", true); return; }
      if(ownedTitles(st).includes(nm)){ toast(st.name+" 已擁有【"+nm+"】", true); return; }
      grantTitle(st, nm); save(); render();
    };
  });
  // 自訂稱號建立
  const tdAdd = document.getElementById("tdAdd");
  if(tdAdd) tdAdd.onclick = ()=>{
    const nm = (document.getElementById("tdName").value||"").trim();
    if(!nm){ toast("請輸入稱號名稱", true); return; }
    if(titleDefOf(nm) || ACHIEVEMENTS.some(a=>a.title===nm)){ toast("稱號【"+nm+"】已存在", true); return; }
    const EFF = { atk3:[{atk:3},"⚔ ATK +3"], def3:[{def:3},"🛡 DEF +3"], agi3:[{agi:3},"💨 AGI +3"], int3:[{int:3},"🔮 INT +3"],
      hp20:[{hp:20},"❤️ HP 上限 +20"], xp10:[{xpMul:0.10},"✨ XP +10%"], gold10:[{goldMul:0.10},"💰 金幣 +10%"],
      all1:[{atk:1,def:1,agi:1,int:1},"👑 全屬性 +1"], off10:[{shopOff:0.10},"🏷 商店 9 折"], none:[{},"—"] };
    const pick = EFF[document.getElementById("tdEff").value] || EFF.none;
    if(!state.customTitleDefs) state.customTitleDefs = [];
    state.customTitleDefs.push({name:nm, effect:pick[0], fx:pick[1]});
    save(); render(); toast("稱號【"+nm+"】已建立,可頒發");
  };
  // 刪除自訂稱號
  app.querySelectorAll("[data-tddel]").forEach(b=>{
    b.onclick = ()=>{
      const i = +b.dataset.tddel; const t = state.customTitleDefs[i];
      if(!t) return;
      if(!confirm("刪除自訂稱號【"+t.name+"】?已頒發給學生的會一併收回。")) return;
      state.students.forEach(x=>{
        if(x.customTitles) x.customTitles = x.customTitles.filter(n=>n!==t.name);
        if(x.title===t.name) x.title="";
      });
      state.customTitleDefs.splice(i,1); save(); render();
    };
  });
  // 撤回單一學生稱號
  app.querySelectorAll("[data-revoke]").forEach(b=>{
    b.onclick = (e)=>{
      e.preventDefault();
      const [sid, nm] = b.dataset.revoke.split("|");
      const st = stu(sid); if(!st) return;
      if(!confirm("撤回 "+st.name+" 的稱號【"+nm+"】?")) return;
      if(st.customTitles) st.customTitles = st.customTitles.filter(n=>n!==nm);
      const ach = ACHIEVEMENTS.find(a=>a.title===nm);
      if(ach) st.achievements = st.achievements.filter(id=>id!==ach.id);   // 成就稱號撤回=移除成就
      if(st.title===nm) st.title="";
      save(); render(); toast("已撤回");
    };
  });
  const bsSk = document.getElementById("bsSkip");
  if(bsSk) bsSk.onclick = skipGroupTurn;
  app.querySelectorAll("[data-bscounter]").forEach(b=> b.onclick = ()=>{
    if(view.locked){ toast("投影模式中,操作已鎖定", true); return; }
    bossCounter();
  });
  const bsRest = document.getElementById("bsRest");
  if(bsRest) bsRest.onclick = restAll;
  const bsRestBoard = document.getElementById("bsRestBoard");
  if(bsRestBoard) bsRestBoard.onclick = restAll;
  const bsEnd = document.getElementById("bsEnd");
  if(bsEnd) bsEnd.onclick = ()=>{ if(confirm("中止戰鬥?不會發放任何獎勵。")) endBoss(); };
  const refreshCraftFloor = (id)=>{
    const c=state.customItems.find(x=>x.id===id); if(!c) return;
    const ti=tierInfo(c.tier||"common"), rg=ITEM_LEVEL_RANGE[ti.key]||[1,90];
    const read=(f,fallback)=>{ const el=app.querySelector('[data-f="'+f+'"][data-id="'+id+'"]'); return el ? Number(el.value)||0 : fallback; };
    const spec=Object.assign({},c,{
      itemLevel:Math.max(rg[0],Math.min(rg[1],Math.round(read("level",itemLevelOf(c))))),
      atk:read("atk",c.atk||0), def:read("def",c.def||0), agi:read("agi",c.agi||0), int:read("int",c.int||0)
    });
    const budget=levelStatBudget(ti.key,spec.itemLevel,c.type),used=spec.atk+spec.def+spec.agi+spec.int;
    ["atk","def","agi","int"].forEach(f=>{const el=app.querySelector('[data-f="'+f+'"][data-id="'+id+'"]');if(el)el.max=budget;});
    const floor=equipmentPriceFloor(spec), priceEl=app.querySelector('[data-f="price"][data-id="'+id+'"]');
    if(priceEl){ priceEl.min=floor; if((Number(priceEl.value)||0)<floor) priceEl.value=floor; }
    const label=app.querySelector('[data-price-floor="'+id+'"]');
    if(label){label.textContent="公式底價 "+floor+" 金・物品 Lv."+spec.itemLevel+" 能力值 "+used+" / "+budget+" 點"+(used>budget?"（超出上限）":"")+"；上架時創作者 +30 XP，之後每筆銷售抽 10% 版稅。";label.style.color=used>budget?"#ff8a80":"";}
  };
  app.querySelectorAll('[data-f="level"],[data-f="atk"],[data-f="def"],[data-f="agi"],[data-f="int"]').forEach(el=>{
    if(el.dataset.id) el.oninput=()=>refreshCraftFloor(+el.dataset.id);
  });
  pendingDesigns().forEach(c=>refreshCraftFloor(c.id));
  app.querySelectorAll("[data-dapprove]").forEach(b=> b.onclick = ()=>{
    const id = +b.dataset.dapprove;
    const gv = (f, max)=>{
      const el = app.querySelector('[data-f="'+f+'"][data-id="'+id+'"]');
      return el ? Math.max(0, Math.min(max, +el.value||0)) : 0;
    };
    const c = state.customItems.find(x=>x.id===id);
    const mx = tierInfo((c&&c.tier)||"common").statMax;
    const ok = approveDesign(id, gv("price",99999), {itemLevel:gv("level",90), atk:gv("atk",mx), def:gv("def",mx), agi:gv("agi",mx), int:gv("int",mx)});
    render(); if(ok) toast("作品已上架");
  });
  app.querySelectorAll("[data-dreject]").forEach(b=> b.onclick = ()=>{
    rejectDesign(+b.dataset.dreject); render();
  });
  app.querySelectorAll("[data-dfeature]").forEach(b=> b.onclick = ()=>{
    const id=+b.dataset.dfeature;
    state.weeklyFeaturedDesignId = state.weeklyFeaturedDesignId===id ? null : id;
    save(); render(); toast(state.weeklyFeaturedDesignId===id?"⭐ 已設為本週設計師精選":"已取消本週精選");
  });
  app.querySelectorAll("[data-dremove]").forEach(b=> b.onclick = ()=>{
    const c = state.customItems.find(x=>x.id===+b.dataset.dremove); if(!c) return;
    if(confirm("下架「"+c.name+"」?已購買的學生不受影響。")){ c.status="rejected"; save(); render(); }
  });
  const anMode=document.getElementById("anMode");
  const syncAnnouncementMode=()=>{
    if(!anMode)return;const mode=anMode.value,hint=document.getElementById("anModeHint"),btn=document.getElementById("anAdd");
    app.querySelectorAll("[data-anfields]").forEach(x=>x.style.display=x.dataset.anfields===mode?"grid":"none");
    if(hint)hint.textContent=mode==="weekly"?"系統會在每次活動前依設定自動發布，且同一週只發布一次。":mode==="once"?"到達指定時間後自動發布一次。":"儲存後立刻讓學生看見。";
    if(btn&&!view.announcementEdit)btn.textContent=mode==="now"?"立即發布":"建立排程";
    if(btn&&view.announcementEdit&&mode==="now")btn.textContent="立即發布並移除排程";
  };
  if(anMode){anMode.onchange=syncAnnouncementMode;syncAnnouncementMode();}
  const anAdd = document.getElementById("anAdd");
  if(anAdd) anAdd.onclick = ()=>{
    const t = document.getElementById("anTitle").value.trim();
    const c = document.getElementById("anBody").value.trim();
    if(!t){ toast("請輸入公告標題", true); return; }
    const mode=(document.getElementById("anMode")||{}).value||"now";
    const editing=(state.announcementSchedules||[]).find(x=>x.id===view.announcementEdit)||null;
    if(mode==="now"){
      if(editing)state.announcementSchedules=state.announcementSchedules.filter(x=>x.id!==editing.id);
      view.announcementEdit=null;addAnnouncement(t,c);render();toast("公告已發布");return;
    }
    const data={mode,title:t,content:c,enabled:true};
    if(mode==="once"){
      const at=document.getElementById("anOnceAt").value;if(!at||isNaN(Date.parse(at))){toast("請設定有效的發布日期與時間",true);return;}
      if(Date.parse(at)<=Date.now()){toast("單次預約時間必須晚於現在",true);return;}data.publishAt=at;
    }else{
      data.eventWeekday=+document.getElementById("anWeekday").value;data.eventTime=document.getElementById("anEventTime").value||"07:30";
      data.leadDays=+document.getElementById("anLeadDays").value;data.remindTime=document.getElementById("anRemindTime").value||"07:00";
      if(data.leadDays===0&&data.remindTime>data.eventTime){toast("當天提醒時間不能晚於活動時間",true);return;}
    }
    if(editing){Object.assign(editing,data);editing.lastCycle="";editing.lastFiredAt="";}
    else state.announcementSchedules.push(Object.assign({id:state.nextAnnScheduleId++,createdAt:new Date().toISOString(),lastCycle:"",lastFiredAt:""},data));
    view.announcementEdit=null;save();render();toast(editing?"公告排程已更新":"公告排程已建立");
  };
  const anCancelEdit=document.getElementById("anCancelEdit");if(anCancelEdit)anCancelEdit.onclick=()=>{view.announcementEdit=null;render();};
  app.querySelectorAll("[data-asedit]").forEach(b=>b.onclick=()=>{view.announcementEdit=+b.dataset.asedit;render();});
  app.querySelectorAll("[data-astoggle]").forEach(b=>b.onclick=()=>{const sc=(state.announcementSchedules||[]).find(x=>x.id===+b.dataset.astoggle);if(!sc)return;sc.enabled=!sc.enabled;save();runAnnouncementSchedules();render();toast(sc.enabled?"排程已啟用":"排程已暫停");});
  app.querySelectorAll("[data-asdel]").forEach(b=>b.onclick=()=>{const id=+b.dataset.asdel;if(confirm("刪除這個公告排程？")){state.announcementSchedules=state.announcementSchedules.filter(x=>x.id!==id);if(view.announcementEdit===id)view.announcementEdit=null;save();render();}});
  app.querySelectorAll("[data-adel]").forEach(b=> b.onclick = ()=>{
    if(confirm("刪除這則公告?")){ deleteAnnouncement(+b.dataset.adel); render(); }
  });
  app.querySelectorAll("[data-artin]").forEach(inp=>{
    inp.onchange = ()=>{ if(inp.files && inp.files[0]) importArt(inp.dataset.artin, inp.files[0]); };
  });
  app.querySelectorAll("[data-basepreset]").forEach(b=>b.onclick=()=>openBaseTunePresetEditor(b.dataset.basepreset));
  app.querySelectorAll("[data-artdel]").forEach(b=> b.onclick = ()=>{
    delete state.art[b.dataset.artdel]; save(); render(); toast("已清除,回退向量版");
  });
}
/* 匯入圖檔:等比縮入 256×256 透明畫布後存為 dataURL */
function importArt(key, file){
  const r = new FileReader();
  r.onload = ()=>{
    const im = new Image();
    im.onload = ()=>{
      const c = document.createElement("canvas"); c.width = 256; c.height = 256;
      const g = c.getContext("2d");
      const sc = Math.min(256/im.width, 256/im.height);
      const w = im.width*sc, h = im.height*sc;
      g.drawImage(im, (256-w)/2, (256-h)/2, w, h);
      state.art[key] = (function(){
        let u = c.toDataURL("image/webp", 0.85);
        if(!u.startsWith("data:image/webp")) u = c.toDataURL("image/png");   // 不支援webp退回
        return u;
      })();
      save(); toast("美術已匯入:"+key); render();
    };
    im.onerror = ()=>toast("讀不懂這張圖,請換 PNG/JPG", true);
    im.src = r.result;
  };
  r.readAsDataURL(file);
}

/* 觸控獎勵面板 */
function openAwardModal(sid, ev){
  const s = stu(sid); if(!s) return;
  const pt = ev ? {x:ev.clientX, y:ev.clientY} : null;
  modalHost.innerHTML =
    '<div class="overlay" id="ovl"><div class="modal">'
    + dollSVG(s, 84)
    + '<h4>'+esc(s.name)+'</h4>'
    + '<div class="msub num">Lv.'+s.level+'・'+s.xp+'/'+xpForNextLevel(s.level)+' XP・'+s.gold+' 金幣</div>'
    + '<div class="big-grid">'
    + state.awardPresets.map(pr=>{
        const lbl = (pr.xp>0?"+"+pr.xp+" XP":"") + (pr.xp>0&&pr.gold>0?" ":"") + (pr.gold>0?"+"+pr.gold+" 金":"");
        return '<button class="big-btn" data-r="'+pr.xp+'|'+pr.gold+'|'+esc(pr.name)+'">'+(lbl||"獎勵")+'<small>'+esc(pr.name)+'</small></button>';
      }).join("")
    + (state.boss ? '<button class="big-btn" style="grid-column:1/-1;border-color:var(--hp)" data-atk="1">⚔ 攻擊 Boss「'+esc(state.boss.name)+'」<small>依 ATK 造成 15–25 基礎傷害</small></button>' : "")
    + '</div>'
    + '<div style="text-align:right;margin-top:-4px"><a href="#" id="mEditPresets" class="mini" style="color:#888">⚙ 編輯快捷鈕</a></div>'
    + '<div class="mini" style="margin:9px 0 4px;font-weight:900">📚 快速填入學習理由</div>'
    + '<div class="inline-form" style="justify-content:center;margin-bottom:7px">'
    + ["專心投入","勇敢回答","解題清楚","小組合作","完成訂正","幫助同學"].map(x=>'<button class="btn" data-reason="'+x+'" style="padding:3px 7px;font-size:11px">'+x+'</button>').join("")
    + '</div>'
    + '<div class="custom">'
    + '<input type="number" id="mXp" placeholder="XP" min="0" value="10">'
    + '<input type="number" id="mGold" placeholder="金幣" min="0" value="0">'
    + '<input type="text" id="mReason" placeholder="原因(選填)" style="width:120px">'
    + '<button class="btn gold" id="mGo">發放</button></div>'
    + '<button class="btn" id="mClose">關閉</button>'
    + '</div></div>';
  const close = ()=>{ modalHost.innerHTML=""; };
  document.getElementById("ovl").onclick = (e)=>{ if(e.target.id==="ovl") close(); };
  document.getElementById("mClose").onclick = close;
  modalHost.querySelectorAll("[data-r]").forEach(b=>{
    b.onclick = (e)=>{
      const [x,g,r] = b.dataset.r.split("|");
      close();
      reward(sid, +x, +g, r, pt || {x:e.clientX, y:e.clientY});
    };
  });
  const atkB = modalHost.querySelector("[data-atk]");
  if(atkB) atkB.onclick = (e)=>{ close(); attackBoss(sid, pt || {x:e.clientX, y:e.clientY}); };
  modalHost.querySelectorAll("[data-reason]").forEach(b=>b.onclick=()=>{ const r=document.getElementById("mReason"); if(r) r.value=b.dataset.reason; });
  document.getElementById("mGo").onclick = ()=>{
    const x = Math.max(0, +document.getElementById("mXp").value || 0);
    const g = Math.max(0, +document.getElementById("mGold").value || 0);
    if(x===0 && g===0){ toast("XP 和金幣至少填一項", true); return; }
    const r = document.getElementById("mReason").value.trim() || "老師獎勵";
    close(); reward(sid, x, g, r, pt);
  };
  const edp = document.getElementById("mEditPresets");
  if(edp) edp.onclick = (e)=>{ e.preventDefault(); close(); openPresetEditor(); };
}
/* 班級登入 QR(投影給學生平板掃碼) */
let _qrLibState = 0;   // 0未載 1載入中 2完成 -1失敗
function loadQrLib(cb){
  if(_qrLibState===2){ cb(true); return; }
  if(_qrLibState===-1){ cb(false); return; }
  const pend = ()=>{ if(_qrLibState===2) cb(true); else if(_qrLibState===-1) cb(false); else setTimeout(pend, 120); };
  if(_qrLibState===1){ pend(); return; }
  _qrLibState = 1;
  const sc = document.createElement("script");
  sc.src = "vendor/qrcode/qrcode.min.js";
  sc.onload = ()=>{ _qrLibState = 2; cb(true); };
  sc.onerror = ()=>{ _qrLibState = -1; cb(false); };
  document.body.appendChild(sc);
}
function openQrModal(){
  const cs=state.classSession||{};
  if(!CLOUD.cid){ toast("離線測試無法產生學生登入 QR",true); return; }
  if(!classSessionIsLive(cs)){ toast("本節課通行證已失效，請回課堂首頁重新按下「開始上課」",true); return; }
  openClassQr(CLOUD.cid, state.className || state.lbName || "本班", cs.token);
}
function openClassQr(cid, cname, sessionToken){
  if(!sessionToken){ toast("請先進入班級並開始上課",true); return; }
  const entryUrl=new URL(location.href); entryUrl.search=""; entryUrl.hash="";
  entryUrl.searchParams.set("class",cid);entryUrl.searchParams.set("session",sessionToken);entryUrl.searchParams.set("student","1");
  const link=entryUrl.toString();
  modalHost.innerHTML = '<div class="overlay qr-login-overlay" id="ovl"><div class="modal qr-login-modal" style="max-width:440px;text-align:center">'
    + '<h4>📱 '+esc(cname)+'・本節課登入</h4>'
    + '<div class="msub">全班掃同一張 QR → 使用自己的 Google 帳號。<br>已註冊會直接進入角色；第一次使用會自動進入學號、座號名冊核對。</div>'
    + '<div class="panel" style="margin:8px 0;padding:8px;background:#fff8df;color:#141414"><span class="mini">班級代碼</span><br><b class="num" style="font-size:22px;letter-spacing:2px">'+esc(cid)+'</b></div>'
    + '<div id="qrBox" class="qr-login-box" style="display:flex;justify-content:center;padding:14px;background:#fff;border:3px solid #141414;border-radius:12px;margin:10px auto;align-items:center">產生中…</div>'
    + '<div class="inline-form" style="justify-content:center"><input type="text" readonly value="'+esc(link)+'" id="qrLink" style="flex:1;font-size:11px;max-width:280px"><button class="btn" id="qrCopy">複製</button></div>'
    + '<div class="mini" style="margin-top:7px;color:#8a5a00">🔐 此 QR Code 只在本節課有效；教師結束上課後立即失效。</div>'
    + '<button class="btn" id="mClose" style="margin-top:8px">關閉</button></div></div>';
  const close = ()=>{ modalHost.innerHTML=""; };
  document.getElementById("ovl").onclick = (e)=>{ if(e.target.id==="ovl") close(); };
  document.getElementById("mClose").onclick = close;
  document.getElementById("qrCopy").onclick = ()=>{
    const inp = document.getElementById("qrLink"); inp.select();
    try{ document.execCommand("copy"); toast("連結已複製"); }catch(e){ toast("請手動複製", true); }
  };
  loadQrLib(ok=>{
    const box = document.getElementById("qrBox");
    if(!box) return;
    if(ok && window.QRCode){
      box.innerHTML = "";
      new QRCode(box, { text: link, width: 260, height: 260, correctLevel: QRCode.CorrectLevel.M });
    }else{
      box.innerHTML = '<div class="mini">QR 產生器載入失敗(網路限制)。<br>請直接把下方連結發到班群。</div>';
    }
  });
}
/* 快捷加分鈕編輯器 */
function openPresetEditor(){
  const rows = state.awardPresets.map((pr,i)=>
    '<div class="inline-form" style="margin-bottom:6px">'
    + '<input type="text" value="'+esc(pr.name)+'" data-pn="'+i+'" style="width:110px">'
    + '<input type="number" value="'+pr.xp+'" data-px="'+i+'" min="0" style="width:64px" placeholder="XP">'
    + '<input type="number" value="'+pr.gold+'" data-pg="'+i+'" min="0" style="width:64px" placeholder="金">'
    + '<button class="btn danger" data-pdel="'+i+'">✕</button></div>').join("");
  modalHost.innerHTML = '<div class="overlay" id="ovl"><div class="modal" style="max-width:380px">'
    + '<h4>⚙ 快捷加分鈕</h4><div class="msub">名稱 / XP / 金幣(全班共用,最多 6 顆)</div>'
    + '<div style="text-align:left">'+rows+'</div>'
    + (state.awardPresets.length<6 ? '<button class="btn" id="pAdd">➕ 新增一顆</button> ' : "")
    + '<button class="btn gold" id="pSave">儲存</button> <button class="btn" id="mClose">取消</button></div></div>';
  const close = ()=>{ modalHost.innerHTML=""; };
  document.getElementById("ovl").onclick = (e)=>{ if(e.target.id==="ovl") close(); };
  document.getElementById("mClose").onclick = close;
  const pAdd = document.getElementById("pAdd");
  if(pAdd) pAdd.onclick = ()=>{ state.awardPresets.push({name:"新項目", xp:10, gold:0}); openPresetEditor(); };
  modalHost.querySelectorAll("[data-pdel]").forEach(b=> b.onclick = ()=>{
    state.awardPresets.splice(+b.dataset.pdel, 1); openPresetEditor();
  });
  document.getElementById("pSave").onclick = ()=>{
    modalHost.querySelectorAll("[data-pn]").forEach(inp=>{ state.awardPresets[+inp.dataset.pn].name = inp.value.trim()||"獎勵"; });
    modalHost.querySelectorAll("[data-px]").forEach(inp=>{ state.awardPresets[+inp.dataset.px].xp = Math.max(0,+inp.value||0); });
    modalHost.querySelectorAll("[data-pg]").forEach(inp=>{ state.awardPresets[+inp.dataset.pg].gold = Math.max(0,+inp.value||0); });
    save(); close(); toast("快捷鈕已更新");
  };
}
/* 批次發獎彈窗 */
function openMultiModal(){
  const ids = view.multiSel || [];
  if(!ids.length){ toast("還沒勾選學生", true); return; }
  const names = ids.map(id=>(stu(id)||{name:"?"}).name).join("、");
  modalHost.innerHTML = '<div class="overlay" id="ovl"><div class="modal">'
    + '<h4>批次獎勵('+ids.length+' 人)</h4>'
    + '<div class="msub" style="max-height:60px;overflow:auto">'+esc(names)+'</div>'
    + '<div class="big-grid">'
    + state.awardPresets.map(pr=>{
        const lbl = (pr.xp>0?"+"+pr.xp+" XP":"") + (pr.xp>0&&pr.gold>0?" ":"") + (pr.gold>0?"+"+pr.gold+" 金":"");
        return '<button class="big-btn" data-r="'+pr.xp+'|'+pr.gold+'|'+esc(pr.name)+'">'+(lbl||"獎勵")+'<small>'+esc(pr.name)+'</small></button>';
      }).join("")
    + '</div>'
    + '<div class="custom">'
    + '<input type="number" id="mXp" placeholder="XP" min="0" value="10">'
    + '<input type="number" id="mGold" placeholder="金幣" min="0" value="0">'
    + '<input type="text" id="mReason" placeholder="原因(選填)" style="width:120px">'
    + '<button class="btn gold" id="mGo">發放</button></div>'
    + '<button class="btn" id="mClose">關閉</button></div></div>';
  const close = ()=>{ modalHost.innerHTML=""; };
  const fire = (x,g,r)=>{
    ids.forEach(id=> reward(id, x, g, r));
    view.multiSel = null;
    close(); render();
    toast("已發獎勵給 "+ids.length+" 人:"+r);
  };
  document.getElementById("ovl").onclick = (e)=>{ if(e.target.id==="ovl") close(); };
  document.getElementById("mClose").onclick = close;
  modalHost.querySelectorAll("[data-r]").forEach(b=> b.onclick = ()=>{
    const [x,g,r] = b.dataset.r.split("|"); fire(+x, +g, r||"批次獎勵");
  });
  document.getElementById("mGo").onclick = ()=>{
    const x = Math.max(0, +document.getElementById("mXp").value||0);
    const g = Math.max(0, +document.getElementById("mGold").value||0);
    if(x===0 && g===0){ toast("XP 和金幣至少填一項", true); return; }
    fire(x, g, document.getElementById("mReason").value.trim()||"批次獎勵");
  };
}
function openGroupModal(gname){
  const n = state.students.filter(s=>s.group===gname).length;
  modalHost.innerHTML =
    '<div class="overlay" id="ovl"><div class="modal">'
    + '<h4>'+esc(gname)+' 組・整組獎勵</h4>'
    + '<div class="msub">共 '+n+' 名成員,每人都會獲得</div>'
    + '<div class="big-grid">'
    + state.awardPresets.map(pr=>{
        const lbl = (pr.xp>0?"+"+pr.xp+" XP":"") + (pr.xp>0&&pr.gold>0?" ":"") + (pr.gold>0?"+"+pr.gold+" 金":"");
        return '<button class="big-btn" data-r="'+pr.xp+'|'+pr.gold+'|'+esc(pr.name)+'">'+(lbl||"獎勵")+'<small>'+esc(pr.name)+'</small></button>';
      }).join("")
    + '</div><button class="btn" id="mClose">關閉</button></div></div>';
  const close = ()=>{ modalHost.innerHTML=""; };
  document.getElementById("ovl").onclick = (e)=>{ if(e.target.id==="ovl") close(); };
  document.getElementById("mClose").onclick = close;
  modalHost.querySelectorAll("[data-r]").forEach(b=>{
    b.onclick = ()=>{ const [x,g,rs] = b.dataset.r.split("|"); close(); rewardGroup(gname, +x, +g, gname+" 組・"+(rs||"獎勵")); };
  });
}

/* ── 學生端 ───────────────────────────────────────── */
/* 學生遙控端狀態 */
const GPAD = { live:null, unsub:null, sid:null, moveHoldTimer:0, moveDir:"", holdBound:false, sendMove:null };
function garenaPadStopMoveHold(){
  const dir=GPAD.moveDir;
  if(GPAD.moveHoldTimer)clearInterval(GPAD.moveHoldTimer);
  GPAD.moveHoldTimer=0;GPAD.moveDir="";
  if(dir&&GPAD.sendMove)GPAD.sendMove({move:dir,moveState:"stop"});
}
function garenaStudentInit(sid){
  if(GPAD.unsub && GPAD.sid===sid) return;                  // 已在監聽
  if(GPAD.unsub)try{GPAD.unsub();}catch(e){console.warn("garena previous listener",e);}
  GPAD.sid = sid;
  try{
    GPAD.unsub = CLOUD.garenaListenLive(live=>{
      const wasIn = GPAD.live && GPAD.live.fighters && GPAD.live.fighters.some(f=>f.sid===sid);
      GPAD.live = live;
      const nowIn = live && live.active && live.fighters && live.fighters.some(f=>f.sid===sid && !f.ko);
      // 進場/退場/狀態變化 → 重繪遙控器覆蓋層
      garenaPadRender();
    });
  }catch(e){
    /* Dota 遙控器不是學生首頁的必要條件；權限或網路問題只停用遙控器，
     * 不讓 renderStudent 整頁中斷。 */
    GPAD.unsub=null;GPAD.live=null;
    console.warn("garena student listener",e);
  }
}
function garenaPadRender(){
  let ov = document.getElementById("gpadOverlay");
  const live = GPAD.live, sid = GPAD.sid;
  const me = live && live.fighters && live.fighters.find(f=>f.sid===sid);
  // 陣亡觀戰:自己KO但戰鬥還在→顯示觀戰畫面(不是收起遙控器)
  if(live && live.active && me && me.ko && !live.over){
    garenaPadStopMoveHold();
    if(!ov){ ov=document.createElement("div"); ov.id="gpadOverlay"; ov.style.cssText="position:fixed;inset:0;background:rgba(20,16,10,.94);z-index:200;display:flex;flex-direction:column;justify-content:center"; document.body.appendChild(ov); }
    ov.innerHTML = '<div class="gpad-wrap"><div style="font-size:42px">💀</div>'
      + '<div style="color:#fff;font-weight:900;font-size:20px;margin:8px 0">'+((live.mode==="moba"||live.mode==="mobaKnowledge")?'英雄倒下・基地重整中':'你已陣亡,為隊友加油!')+'</div>'
      + ((live.mode==="moba"||live.mode==="mobaKnowledge")?'<div style="color:#ffe486;font-size:28px;font-weight:900">'+Math.max(1,Math.ceil((me.respawnT||1)/2))+' 秒後復活</div>':'')
      + '<div style="color:#ffd234;font-size:15px">🔴 '+live.aliveR+' 存活　VS　'+live.aliveB+' 🔵</div>'
      + '<div style="color:#aaa;font-size:12px;margin-top:10px">戰鬥結束後自動關閉</div></div>';
    return;
  }
  const show = live && live.active && me && !me.ko && !live.over;
  if(!show){
    garenaPadStopMoveHold();
    if(ov){
      if(live && live.over && me){                           // 戰鬥結束:遙控器變結果卡(2秒後自動收)
        ov.innerHTML = '<div class="gpad-wrap"><div style="color:#ffd234;font-weight:900;font-size:22px">⚔️ 團體戰結束!</div>'
          + '<div style="color:#fff;font-size:14px;margin-top:8px">'+(me.ko?"你已陣亡,但戰鬥到最後!":"你撐到了最後!")+'</div></div>';
        setTimeout(()=>{ const o=document.getElementById("gpadOverlay"); if(o)o.remove(); }, 2500);
      } else { ov.remove(); }
    }
    return;
  }
  const st = stu(sid);
  const range = weaponRange(st);
  const ready = false;
  const jsDef = jobSkillAvailable(st) ? (JOB_SKILL[st.job] || null) : null;
  const equippedBattleSkills=normalizeSkillLoadout(st).map(id=>skillDef(st.job,id)).filter(Boolean);
  const jcNow = Number(me.jc)||0, jcPct=Math.max(0,Math.min(100,Number(me.jcp)||0));
  if(!ov){
    ov = document.createElement("div");
    ov.id = "gpadOverlay";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(20,16,10,.92);z-index:200;display:flex;flex-direction:column;justify-content:center";
    document.body.appendChild(ov);
  }
  // 小地圖:自己金點、隊友同色小點、敵人灰點
  const mmW=Math.min(160, live.W*11), mmScale=mmW/live.W, mmH=live.H*mmScale;
  const structureDots=(live.structures||[]).filter(q=>q.alive).map(q=>'<div title="'+(q.type==="core"?'核心':'防禦塔')+'" style="position:absolute;left:'+(q.x*mmScale)+'px;top:'+(q.y*mmScale)+'px;width:'+(q.type==="core"?10:7)+'px;height:'+(q.type==="core"?10:7)+'px;transform:rotate(45deg);background:'+(q.team==="red"?'#e05252':'#5285e0')+';border:1px solid #fff"></div>').join("");
  const dots = live.fighters.filter(f=>!f.ko).map(f=>{
    const isMe=f.sid===sid;
    const ally = f.team===me.team;
    if(!ally && (f.st||0)>0) return "";                      // 🌫 敵方隱身者:小地圖看不到
    const col = isMe?"#f5c518":(ally?(me.team==="red"?"#e05252":"#5285e0"):"#999");
    const sz = isMe?9:6;
    const op = ally && (f.st||0)>0 ? ";opacity:.45" : "";    // 己方隱身:半透明可見
    return '<div style="position:absolute;left:'+(f.x*mmScale)+'px;top:'+(f.y*mmScale)+'px;width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+col+(isMe?';box-shadow:0 0 0 2px #fff,0 0 8px #f5c518;z-index:2':'')+op+'"></div>';
  }).join("");
  const isMobaLive=live.mode==="moba"||live.mode==="mobaKnowledge";
  const minimap = '<div style="position:relative;width:'+mmW+'px;height:'+mmH+'px;margin:6px auto;background:'+(isMobaLive?'linear-gradient(135deg,#315b43,#214633)':'rgba(255,255,255,.12)')+';border:2px solid #ffd234;border-radius:6px">'+structureDots+dots+'</div>';
  const mq=live.mobaQuiz,wrong=mq&&mq.wrong&&mq.wrong[me.team]||[],quizPanel=mq?'<div style="margin:6px auto;padding:8px;max-width:460px;border:3px solid #ffd234;border-radius:12px;background:#fff8dc;color:#171717"><b>📚 第 '+(mq.round||1)+' 題｜'+esc(mq.prompt)+'</b>'+quizGeometryHtml(mq.visualSvg,"mobile-geometry")+quizImageHtml(mq.questionImage,"zone-question-img","題目圖片")+'<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-top:6px">'+["A","B","C","D"].map((k,i)=>'<span style="padding:4px;border:2px solid #111;border-radius:9px;'+(wrong.includes(k)?'filter:grayscale(1);opacity:.35;':'background:#fff;')+'">'+quizImageHtml((mq.optionImages||[])[i],"ga-tower-option-img",k+" 選項圖片")+k+' '+esc((mq.options||[])[i]||"")+'</span>').join("")+'</div><div style="margin-top:5px;font-size:12px;font-weight:900">答題分 🔴 '+(mq.score.red||0)+'：'+(mq.score.blue||0)+' 🔵　｜　Combo 紅×'+((mq.streak||{}).red||0)+'・藍×'+((mq.streak||{}).blue||0)+'　｜　'+(mq.finished?'下一題':'本題')+' '+(mq.endsIn||0)+'s　｜　集氣 '+Math.min(100,Math.round((me.qc||0)/6*100))+'%</div></div>':'';
  const autoOn=!!me.ap,autoLock=Math.max(0,Number(me.au)||0),manualDisabled=autoOn?' disabled':'';
  const skillBtns=equippedBattleSkills.slice(0,5).map(sk=>{const ci=(me.sc||{})[sk.id]||{},cd=Math.max(0,Number(ci.left)||0),pct=Math.max(0,Math.min(100,Number(ci.pct)||0));return '<button class="gpad-btn gpad-skill '+(cd>0?'cooling':'ready')+'" style="--cd-pct:'+pct+'" data-gskill="'+esc(sk.id)+'"'+(cd>0?' disabled':'')+'><span class="si">'+sk.icon+'</span><span>'+esc(sk.name)+'</span>'+(cd>0?'<span class="cd-time">'+Math.ceil(cd)+'s</span>':'')+'</button>';}).join('');
  ov.innerHTML = '<div class="gpad-wrap">'
    + '<div style="color:#fff;font-weight:900;font-size:18px">'+(live.mode==="mobaKnowledge"?'📚 知識攻塔':(live.mode==="moba"?'🏰 Dota 戰場・榮耀峽谷':'⚔️ 團體戰進行中!'))+'</div>'
    + '<div style="color:#ffd234;font-size:13px;margin:4px 0">HP '+me.hp+'/'+me.max+'・射程 '+range+' 格・'+(me.team==="red"?"🔴紅隊":"🔵藍隊")+'・🔴'+live.aliveR+' vs '+live.aliveB+'🔵</div>'
    + quizPanel+'<div style="color:#fff;font-size:11px">📍 你的位置(金點)</div>' + minimap
    + '<div style="color:#dce8ff;font-size:11px;margin:4px 0">🎒 已裝備：'+(equippedBattleSkills.map(sk=>sk.icon+esc(sk.name)).join('・')||'尚未裝備技能')+'</div>'
    + '<button class="gpad-btn gpad-auto '+(autoOn?'on':'')+'" id="gpadAuto"'+(autoOn&&autoLock>0?' disabled':'')+'>'+(autoOn?(autoLock>0?'🤖 AI 自動戰鬥・'+autoLock+' 秒後可解除':'🎮 解除 AI・返回手動'):'🤖 AI 自動戰鬥')+'</button>'
    + '<div class="gpad-grid">'
    + '<div></div><div class="gpad-btn'+(autoOn?' disabled':'')+'" data-gmove="up">▲</div><div></div>'
    + '<div class="gpad-btn'+(autoOn?' disabled':'')+'" data-gmove="left">◀</div><div class="gpad-btn'+(autoOn?' disabled':'')+'" data-gmove="down">▼</div><div class="gpad-btn'+(autoOn?' disabled':'')+'" data-gmove="right">▶</div>'
    + '</div>'
    + '<div class="gpad-act">'
    + '<button class="gpad-btn gpad-atk" data-gact="attack"'+manualDisabled+'>⚔️ 攻擊</button>'
    + (jsDef ? '<button class="gpad-btn gpad-job '+(jcNow>0?'cooling':'ready')+'" style="--cd-pct:'+jcPct+'" data-gact="jobskill"'+((jcNow>0||autoOn)?" disabled":"")+'><span>'+jsDef.icon+' '+jsDef.name+'</span>'+(jcNow>0?'<span class="cd-time">'+Math.ceil(jcNow)+'s</span>':"")+'</button>' : "")
    + (ready ? '<button class="gpad-btn gpad-ult" data-gact="ult">💫 大招</button>' : '')
    + '</div>'
    + (skillBtns?'<div style="color:#ffe486;font-size:11px;margin-top:7px">裝備技能（點按施放）</div><div class="gpad-skills" style="'+(autoOn?'pointer-events:none;filter:grayscale(.8);opacity:.45':'')+'">'+skillBtns+'</div>':'')
    + (jsDef ? '<div style="color:#aaa;font-size:11px;margin-top:4px">'+jsDef.icon+' '+jsDef.desc+'</div>' : "")
    + '<div style="color:#aaa;font-size:11px;margin-top:10px">移動到敵人射程內再攻擊・攻擊有冷卻</div>'
    + '</div>';
  const send = (cmd)=> CLOUD.garenaCmd(sid, cmd).catch(e=>console.warn(e));
  GPAD.sendMove=send;
  if(!GPAD.holdBound){GPAD.holdBound=true;window.addEventListener("pointerup",garenaPadStopMoveHold);window.addEventListener("pointercancel",garenaPadStopMoveHold);window.addEventListener("blur",garenaPadStopMoveHold);}
  const autoBtn=ov.querySelector("#gpadAuto");if(autoBtn)autoBtn.onclick=()=>{if(!autoBtn.disabled){garenaPadStopMoveHold();send({act:"autopilot",enabled:!autoOn});}};
  ov.querySelectorAll("[data-gmove]").forEach(b=>{const go=()=>send({move:b.dataset.gmove,moveState:"start"});b.onpointerdown=e=>{e.preventDefault();if(autoOn)return;garenaPadStopMoveHold();GPAD.moveDir=b.dataset.gmove;go();GPAD.moveHoldTimer=setInterval(go,1500);};b.onclick=e=>e.preventDefault();});
  ov.querySelectorAll("[data-gact]").forEach(b=> b.onclick = ()=>{ if(!b.disabled) send({act:b.dataset.gact}); });
  ov.querySelectorAll("[data-gskill]").forEach(b=>b.onclick=()=>{if(!b.disabled)send({act:"skill",skillId:b.dataset.gskill});});
}
function openBaseTuneEditor(s){
  const clampBaseTune = (v,a,b)=>Math.max(a,Math.min(b,v));
  const old = s.baseTune || {};
  const tune = {x:clampBaseTune(Number(old.x)||0,-18,18), y:clampBaseTune(Number(old.y)||0,-18,18), s:clampBaseTune(Number(old.s)||1,.55,1.65)};
  modalHost.innerHTML = '<div class="overlay" id="baseTuneOverlay"><div class="modal" style="max-width:360px;text-align:center">'
    + '<h3 style="margin-top:0">🎯 素體位置調整</h3><div class="mini" style="margin-bottom:8px">拖曳人物移動；右上角 ↗ 縮放。裝備會留在基準位置。</div>'
    + '<div id="baseTuneStage" style="height:260px;position:relative;display:flex;align-items:flex-end;justify-content:center;touch-action:none;user-select:none;overflow:visible"></div>'
    + '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px"><button class="btn" id="baseTuneReset">重設</button><button class="btn" id="baseTuneCancel">取消</button><button class="btn gold" id="baseTuneSave">套用</button>'
    + (registrationSetupEditable(s)?'<button class="btn" id="baseVariantReopen" style="flex-basis:100%">🧍 重新選擇註冊素體</button>':'')+'</div>'
    + '</div></div>';
  const stage = document.getElementById("baseTuneStage");
  let drag = null;
  const draw = ()=>{
    stage.innerHTML = '<div id="baseTuneCanvas" style="position:relative;width:220px;height:260px;display:flex;align-items:flex-end;justify-content:center;cursor:move">'
      + dollSVG(Object.assign({},s,{baseTune:tune}),220)
      + '<button type="button" id="baseTuneGrip" aria-label="拖曳縮放素體" title="拖曳縮放素體" style="position:absolute;right:0;top:4px;width:30px;height:30px;padding:0;border:2px solid #141414;border-radius:8px;background:var(--gold);font-size:19px;font-weight:900;line-height:22px;cursor:nwse-resize;z-index:3">↗</button></div>';
  };
  draw();
  stage.addEventListener("pointerdown",e=>{
    const target = e.target.closest && e.target.closest("#baseTuneGrip");
    drag={id:e.pointerId,mode:target?"scale":"move",x:e.clientX,y:e.clientY,tune:Object.assign({},tune)};
    stage.setPointerCapture(e.pointerId); e.preventDefault();
  });
  stage.addEventListener("pointermove",e=>{
    if(!drag || drag.id!==e.pointerId) return;
    const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    if(drag.mode==="scale") tune.s=clampBaseTune(drag.tune.s+(dx-dy)/180,.55,1.65);
    else { tune.x=clampBaseTune(drag.tune.x+dx*.46,-18,18); tune.y=clampBaseTune(drag.tune.y+dy*.46,-18,18); }
    draw();
  });
  const stop = e=>{ if(drag && drag.id===e.pointerId){drag=null;try{stage.releasePointerCapture(e.pointerId);}catch(_){}} };
  stage.addEventListener("pointerup",stop); stage.addEventListener("pointercancel",stop);
  document.getElementById("baseTuneReset").onclick=()=>{ tune.x=0;tune.y=0;tune.s=1;draw(); };
  document.getElementById("baseTuneCancel").onclick=()=>{ modalHost.innerHTML=""; };
  document.getElementById("baseTuneOverlay").onclick=e=>{ if(e.target.id==="baseTuneOverlay") modalHost.innerHTML=""; };
  document.getElementById("baseTuneSave").onclick=()=>{ s.baseTune=Object.assign({},tune); save(); modalHost.innerHTML=""; toast("已套用素體位置調整"); render(); };
  const reopen=document.getElementById("baseVariantReopen");if(reopen)reopen.onclick=()=>{
    modalHost.innerHTML="";
    renderJobPick(s,(FB.user&&FB.user.email)||s.email||"",{selectedJob:s.job,selectedBase:s.baseVariant,selectedTune:Object.assign({},s.baseTune||{}),birth:s.birth||"",repairMode:true,returnToStudent:true});
  };
}
function openStatInfo(s,key){
  const t=totalStats(s), dodge=rogueDodgeProfile(s), crit=combatCritProfile(s,null), info={
    atk:{icon:'⚔️',name:'ATK・攻擊',text:'提高物理傷害，採遞減成長避免高等級傷害失控。戰士的主要輸出能力；部分武器與攻擊型技能會再依此加成。',now:t.atk,extra:'能力上限 '+STAT_CAP},
    def:{icon:'🛡️',name:'DEF・防禦',text:'降低受到的物理傷害，越高仍有提升但不會達到完全免傷。盾牆、格擋與守護效果會在防禦基礎上再疊加。',now:t.def,extra:'能力上限 '+STAT_CAP+'・一般減傷保留最低受傷'},
    agi:{icon:'💨',name:'AGI・敏捷',text:'提高迴避、少量爆擊率，並加快戰場的隱藏行動條；效果會沿著 10～200 的完整區間平穩成長。',now:t.agi,extra:'迴避 '+agiDodge(s).toFixed(1)+'%（上限 '+dodge.cap.toFixed(0)+'%）・爆擊 '+crit.chance.toFixed(1)+'%（職業上限 '+crit.cap+'%）・能力上限 '+STAT_CAP},
    int:{icon:'🔮',name:'INT・智力',text:'以百分比縮短所有技能的實際冷卻時間，並小幅提高技能觸發率與法術表現。強力技能仍保留最低冷卻。',now:t.int,extra:'技能觸發 +'+intSkillBonus(s).toFixed(1)+'%・冷卻縮減 '+intCooldownReductionPct(s).toFixed(1)+'%（最高 35%）・能力上限 '+STAT_CAP}
  }[key];
  if(!info) return;
  modalHost.innerHTML='<div class="overlay" id="statInfoOverlay"><div class="modal" style="max-width:350px;text-align:center">'
    +'<h3 style="margin-top:0">'+info.icon+' '+info.name+'</h3><div style="font-size:30px;font-weight:900;margin:8px 0">'+info.now+'</div>'
    +'<div class="mini" style="line-height:1.8">'+info.text+'</div>'+(info.extra?'<div class="tag" style="margin-top:10px">'+info.extra+'</div>':'')
    +'<div style="margin-top:14px"><button class="btn gold" id="statInfoClose">知道了</button></div></div></div>';
  document.getElementById('statInfoClose').onclick=()=>{modalHost.innerHTML='';};
  document.getElementById('statInfoOverlay').onclick=e=>{if(e.target.id==='statInfoOverlay')modalHost.innerHTML='';};
}

document.getElementById("btnHome").onclick = ()=>{
  // 教師(已登入):直接回「我的班級」切換班級,不用重新登入
  if(CLOUD.role==="teacher" && FB.ready && FB.user){
    CLOUD.stopListen && CLOUD.stopListen();                  // 停掉目前班級的監聽
    if(GARENA.active) garenaStop();                          // 團體戰進行中一併收掉
    view = {page:"classes", role:"teacher"};
    renderClasses((FB.user.email||"").toLowerCase());
    return;
  }
  if(FB.ready && FB.user){ FB.auth.signOut().catch(()=>{}); FB.user=null; }
  view={page:"home"}; render();
};
document.getElementById("btnLogout").onclick = ()=>{ doLogout(); };
document.getElementById("btnSound").onclick = function(){
  soundOn = !soundOn;
  this.textContent = soundOn ? "🔊" : "🔇";
  toast(soundOn ? "音效已開啟" : "音效已關閉");
};
document.addEventListener("click",e=>{
  const img=e.target.closest&&e.target.closest(".zone-question-img,.zone-option-img");
  if(img){e.preventDefault();e.stopPropagation();openQuizImage(img.currentSrc||img.src,img.alt);}
});

const _mobaPhonePage=false;
render();

/* ── 系統穩定性保險 ─────────────────────────────── */
/* 1. 全域錯誤捕捉:未預期錯誤不再無聲死亡,提示使用者(資料在 localStorage/雲端,重整可復原) */
window.addEventListener("error", (e)=>{
  if(window._errToastTs && Date.now()-window._errToastTs < 8000) return;   // 8秒內不重複
  window._errToastTs = Date.now();
  try{ toast("⚠️ 系統發生錯誤:"+(e.message||"未知")+"。資料已保存,若功能異常請重新整理頁面。", true); }catch(_){}
});
window.addEventListener("unhandledrejection", (e)=>{
  if(window._errToastTs && Date.now()-window._errToastTs < 8000) return;
  window._errToastTs = Date.now();
  const msg = (e.reason && (e.reason.message||e.reason)) || "未知";
  try{ toast("⚠️ 背景作業失敗:"+String(msg).slice(0,80)+"。若持續發生請重新整理。", true); }catch(_){}
});
/* 2. 關頁/切出前:立即送出還在節流佇列的雲端同步,避免「改完馬上關頁」遺失最後一筆 */
function flushCloudNow(){
  try{
    if(CLOUD.on() && CLOUD._timer){
      clearTimeout(CLOUD._timer); CLOUD._timer = null;
      CLOUD.pushDirty().catch(()=>{});                    // fire-and-forget,盡力送出
    }
  }catch(_){}
}
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="hidden") flushCloudNow(); else revalidateStudentClassSession(); });
window.addEventListener("beforeunload", flushCloudNow);
window.addEventListener("online",revalidateStudentClassSession);

/* ── 線上登入優化:整頁跳轉登入回跳接手 + 重新整理自動恢復 ── */
if(FB.ready&&!_mobaPhonePage){
  let _loginResumed=false,_entryLoginStarted=false;
  // A. 手機整頁跳轉登入回來:接手完成登入
  FB.auth.getRedirectResult().then(res=>{
    if(res && res.user){
      if(_entryLoginStarted)return;
      _entryLoginStarted=true;
      _loginResumed = true;
      let role = null;
      try{ role = sessionStorage.getItem("rpg-login-role"); sessionStorage.removeItem("rpg-login-role"); }catch(_){}
      const entry=new URLSearchParams(location.search),urlRole=entry.get("teacher")==="1"?"teacher":(entry.get("class")?"student":null);
      loginSuccess(res.user, role || urlRole || localStorage.getItem("rpg-last-role") || "student");
    }
  }).catch(err=>{
    try{sessionStorage.removeItem("rpg-login-role");}catch(_){}
    const code=String(err&&err.code||"");
    if(code!=="auth/popup-closed-by-user")toast("Google 登入回復失敗："+(err&&err.message||err),true);
  });
  // B. 教師 QR 已由 Google 完成身分驗證，直接進入班級選擇，不再要求第二次確認。
  FB.auth.onAuthStateChanged(user=>{
    if(_loginResumed || !user || FB.user) return;             // 已處理過/未登入/已在使用中
    if(view.page!=="home") return;                            // 使用者已在別的頁面,不干擾
    const entry=new URLSearchParams(location.search),entryCid=normalizeClassCode(entry.get("class")||"");
    if(entry.get("teacher")==="1"){
      if(_entryLoginStarted)return;
      _entryLoginStarted=true;try{sessionStorage.removeItem("rpg-login-role");}catch(_){}FB.user=user;loginSuccess(user,"teacher");return;
    }
    else if(entryCid&&(entry.get("session")||entry.get("dota")||entry.get("reward"))){
      // 已在同一裝置完成「學生提前登入」時，掃描有效課堂 QR 可直接接續；
      // 共用平板沒有等待記號時仍要求本人按下快速登入，避免沿用上一位同學。
      let waitingEmail="";try{waitingEmail=String(localStorage.getItem("rpg-student-waiting-email")||"").toLowerCase();}catch(_){}
      if(waitingEmail&&waitingEmail===String(user.email||"").toLowerCase()){
        if(_entryLoginStarted)return;
        _entryLoginStarted=true;FB.user=user;
        try{sessionStorage.setItem("rpg-student-mode","login");sessionStorage.removeItem("rpg-student-join");}catch(_){}
        loginSuccess(user,"student");return;
      }
      FB.user=user;offerStudentQuickLogin(user);return;
    }
    // 一般首頁提供教師、學生等待與家長入口，但不自動帶入共用裝置的舊帳號。
    return;
  });
}
