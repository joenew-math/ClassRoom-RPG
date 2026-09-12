/* Six-piece equipment: never part of the gold/gacha pools. Shared rules are pure. */
"use strict";
const PIXEL_SET_SLOTS=['hat','clothes','pants','shoes','weapon','back'];
const PIXEL_SETS=[
  {id:'star_knight',job:'Warrior',name:'星曜騎士',color:'#72d7ed',cloth:'#172744',atlas:'star-knight',baseId:20001,tiers:[['鋼鐵意志','防禦 +4'],['守護誓約','受到的直接攻擊傷害減少 8%'],['星曜堡壘','最大生命增加 15%']]},
  {id:'crystal_sage',job:'Mage',name:'秘晶賢者',color:'#ba91ff',cloth:'#392255',atlas:'crystal-sage',baseId:20011,tiers:[['秘晶研習','智力 +4'],['奧術循環','技能冷卻縮減額外 +8 個百分點（總上限 40%）'],['元素聚焦','直接攻擊與法術傷害增加 12%']]},
  {id:'jade_hunter',job:'Rogue',name:'翠羽追獵者',color:'#7bdb9a',cloth:'#183d2b',atlas:'jade-hunter',baseId:20021,tiers:[['林間步伐','敏捷 +4'],['鷹眼精準','暴擊率 +6 個百分點（仍受職業上限限制）'],['疾風節奏','普攻等待時間縮短 10%']]},
  {id:'dawn_oracle',job:'Cleric',name:'曙光神官',color:'#ffd48a',cloth:'#dfcba8',atlas:'dawn-oracle',baseId:20031,tiers:[['晨曦祈願','智力 +4'],['慈悲祝禱','治療量增加 12%'],['聖光庇護','自身直接攻擊承傷減少 8%；技能冷卻縮減額外 +5 個百分點']]}
];
const PIXEL_SET_ITEMS=PIXEL_SETS.flatMap(set=>PIXEL_SET_SLOTS.map((type,i)=>({id:set.baseId+i,name:set.name+'・'+({hat:'冠帽',clothes:'上衣',pants:'護腿',shoes:'戰靴',weapon:'武器',back:'披風'}[type]),type,jobs:[set.job],rarity:'Legendary',price:0,diamondPrice:50,itemLevel:30,pixelSet:set.id,acquisition:['boss','guildDiamond'],atk:set.job==='Warrior'?2:0,def:2,agi:set.job==='Rogue'?2:0,int:['Mage','Cleric'].includes(set.job)?2:0,effect:'BOSS 掉落／公會每件 50💎；同套 2／4／6 件啟動效果'})));
function pixelSetOf(id){return PIXEL_SETS.find(s=>s.id===id)||null;}
function pixelItemOf(id){return PIXEL_SET_ITEMS.find(it=>it.id===Number(id))||null;}
function pixelSetCount(s,set){if(!s||s.job!==set.job)return 0;return PIXEL_SET_SLOTS.reduce((n,slot)=>{const it=pixelItemOf(s[slot+'Id']);return n+(it&&it.type===slot&&it.pixelSet===set.id?1:0);},0);}
function pixelSetEffects(s){const set=PIXEL_SETS.find(x=>x.job===s?.job),n=set?pixelSetCount(s,set):0;const e={atk:0,def:0,agi:0,int:0,ward:0,power:0,heal:0,tempo:0,crit:0,cd:0,hp:0,count:n,setId:set?.id||''};if(n<2)return e;
  if(s.job==='Warrior'){e.def=4;if(n>=4)e.ward=.08;if(n>=6)e.hp=.15;}
  if(s.job==='Mage'){e.int=4;if(n>=4)e.cd=8;if(n>=6)e.power=.12;}
  if(s.job==='Rogue'){e.agi=4;if(n>=4)e.crit=6;if(n>=6)e.tempo=.10;}
  if(s.job==='Cleric'){e.int=4;if(n>=4)e.heal=.12;if(n>=6){e.ward=.08;e.cd=5;}}
  return e;
}
function pixelItemOwned(s,id){const it=pixelItemOf(id);return !!it&&(Number(s[it.type+'Id'])===it.id||(s.bagItems||[]).some(x=>Number(x)===it.id));}
function pixelSetBossDrop(s,random){const set=PIXEL_SETS.find(x=>x.job===s?.job);if(!set)return null;const candidates=PIXEL_SET_ITEMS.filter(x=>x.pixelSet===set.id&&!pixelItemOwned(s,x.id));if(!candidates.length)return null;return candidates[Math.min(candidates.length-1,Math.floor(Math.max(0,Math.min(.999999,random()))*candidates.length))];}
if(typeof SHOP_ITEMS!=='undefined')SHOP_ITEMS.push(...PIXEL_SET_ITEMS);
// Preserve old ownership for migration/backups, but hide retired one-piece appearances.
if(typeof LEGEND_SETS!=='undefined')LEGEND_SETS.forEach(set=>set.retired=true);
if(typeof module!=='undefined')module.exports={PIXEL_SETS,PIXEL_SET_ITEMS,PIXEL_SET_SLOTS,pixelSetOf,pixelItemOf,pixelSetCount,pixelSetEffects,pixelItemOwned,pixelSetBossDrop};
