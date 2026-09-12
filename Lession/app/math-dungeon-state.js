/* math-dungeon-state.js
 * 地下城主要角色／場次持久狀態的唯一預設結構。
 * 新欄位應集中加在這裡，讀檔相容修正仍由 loadChar 處理。
 */
"use strict";

const S={
  hp:100,maxhp:100,lv:1,xp:0,xpNeed:3,
  deck:mkDeck(['knife','knife','dagger','blank','clock','wand','wand','garlic','whip','imelda']),
  gems:[],dmgMul:1,step:.35,handSize:5,armor:0,key:false,mana:6,tomes:0,
  handCap:5,chant:false,allChains:[],gold:0,ups:{},name:'',job:'',
  pot:{heal:1,elixir:0,freeze:0,firebomb:0,luck:0,medkit:0},
  luckChest:0,shrineUses:{},wrong:[],found:[],followers:[],monsterDex:[],
  monsterTraits:{},fusionBook:[],petCardCarry:[],petCardCarrySession:'',
  petCardSentSession:'',zone:0,cleared:-1,zoneBest:{},zoneProgress:{},
  meta:{souls:0,runs:0,totalQ:0,totalOk:0,perks:{}},extAbil:{}
};
