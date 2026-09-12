/* Built-in equipment only. Pure SVG/pixel presentation; never rewrites student art or stats. */
const EQUIPMENT_ART_CACHE=new Map();
const EQUIPMENT_ART_BOX={hat:'17 -7 66 38',clothes:'21 37 58 46',pants:'29 60 42 35',weapon:'45 0 56 84',back:'2 12 96 86',shoes:'23 75 54 25'};
function equipmentTone(hex,amount){
  const n=parseInt(hex.slice(1),16),target=amount>0?[255,246,222]:[20,25,46],a=Math.abs(amount);
  return '#'+[16,8,0].map((shift,i)=>Math.round(((n>>shift)&255)*(1-a)+target[i]*a).toString(16).padStart(2,'0')).join('');
}
function equipmentArtLayer(it,source){
  if(!it||!source)return source||'';
  const key=it.id+'|'+source;if(EQUIPMENT_ART_CACHE.has(key))return EQUIPMENT_ART_CACHE.get(key);
  const colors=new Map(),prefix='equip'+it.id+'_'+(source===RO_ART[it.type]?.[it.id]?'ro':'flat');
  const metal=/劍|槍|戟|棍|甲|盔|鐵|鋼|護腿/.test(it.name),legend=it.rarity==='Legendary';
  let body=source.replace(/fill="(#[0-9a-f]{6})"/gi,(all,hex)=>{
    if(['#ffd9b0','#c98c5e'].includes(hex.toLowerCase()))return all;
    if(!colors.has(hex))colors.set(hex,prefix+'_'+colors.size);
    return 'fill="url(#'+colors.get(hex)+')"';
  });
  const defs=[...colors].map(([hex,id])=>'<linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+equipmentTone(hex,.34)+'"/><stop offset=".32" stop-color="'+hex+'"/><stop offset=".52" stop-color="'+equipmentTone(hex,metal?.52:.12)+'"/><stop offset=".6" stop-color="'+hex+'"/><stop offset="1" stop-color="'+equipmentTone(hex,-.38)+'"/></linearGradient>').join('');
  // Slot-specific craftsmanship details stay inside the existing wearable silhouette.
  const trim=legend?'#ffe3a0':'#dac69b';let detail='';
  if(it.type==='clothes')detail='<path d="M42 49 L44 61 M58 49 L56 61" fill="none" stroke="'+trim+'" stroke-width=".65" opacity=".8"/><path d="M46 51 L50 47 L54 51 L50 57 Z" fill="none" stroke="'+trim+'" stroke-width=".7"/><circle cx="50" cy="51" r="1.2" fill="'+trim+'"/>';
  if(it.type==='pants')detail='<path d="M42 72 L46 73 M54 73 L58 72 M42 79 L46 80 M54 80 L58 79" fill="none" stroke="'+trim+'" stroke-width=".7" opacity=".75"/>';
  if(it.type==='hat')detail='<path d="M36 17 Q50 12 64 17" fill="none" stroke="'+trim+'" stroke-width=".55" stroke-dasharray="1.6 1.8"/>';
  const result='<defs>'+defs+'</defs><g data-equipment-art="v2" stroke-linejoin="round">'+body+detail+'</g>';
  EQUIPMENT_ART_CACHE.set(key,result);return result;
}
function equipmentArtThumb(it,size,source){
  const frame=it.rarity==='Legendary'?'legend':it.rarity==='Rare'?'rare':'common';
  return '<span class="equipment-art-plate '+frame+'" style="width:'+size+'px;height:'+size+'px"><svg viewBox="'+(EQUIPMENT_ART_BOX[it.type]||'0 0 100 100')+'" width="'+Math.round(size*.88)+'" height="'+Math.round(size*.88)+'" aria-hidden="true">'+RO_DEFS+equipmentArtLayer(it,source)+'</svg></span>';
}
function polishStarterPixels(pixels,type,gw,gh,kind,main){
  const out={...pixels},ink='#211c24',metal=['blade','armor','legguard','crown','crest'].includes(kind),cx=(gw-1)/2;
  const occupied=(x,y)=>!!pixels[x+','+y];
  for(const [key,color] of Object.entries(pixels)){
    const [x,y]=key.split(',').map(Number);if(color===ink)continue;
    const edge=!occupied(x-1,y)||!occupied(x+1,y)||!occupied(x,y-1)||!occupied(x,y+1);
    const bevel=Math.abs(x-cx)/Math.max(1,cx),band=metal?(x<cx?-.12:.15):-.12*bevel;
    const light=edge&&!occupied(x,y-1)?.28:!occupied(x,y+1)?-.32:band+(y/gh>.75?-.16:.04);
    out[key]=equipmentTone(color,light);
  }
  const mark=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(out[x+','+y]&&out[x+','+y]!==ink)out[x+','+y]=c;};
  const gold='#e6bb66',shine='#fff1c4',dark=equipmentTone(main,-.5);
  if(['tunic','robe','armor','cape'].includes(kind)){
    for(let y=Math.round(gh*.26);y<gh*.82;y++){
      mark(cx-gw*.2,y,y%4===0?gold:dark);mark(cx+gw*.2,y,y%4===0?gold:dark);
    }
    [[0,-2],[-1,-1],[1,-1],[-2,0],[2,0],[-1,1],[1,1],[0,2]].forEach(([x,y])=>mark(cx+x,gh*.32+y,gold));mark(cx,gh*.32,shine);
  }else if(['shorts','jeans','legguard','runner','boot','magicShoe'].includes(kind)){
    for(const side of [.25,.75])for(const y of [.35,.5,.65]){mark(gw*side-1,gh*y,gold);mark(gw*side,gh*y,shine);mark(gw*side+1,gh*y,dark);}
  }else if(kind==='wings'){
    for(let y=2;y<gh-2;y+=4)for(let x=2;x<gw/2-1;x++){mark(x,y+(x%3),shine);mark(gw-1-x,y+(x%3),shine);}
  }else if(kind==='pack'){
    for(let y=gh*.25;y<gh*.82;y++){mark(gw*.3,y,gold);mark(gw*.7,y,gold);}mark(cx,gh*.52,shine);
  }else{
    for(let y=2;y<gh-2;y+=4){mark(cx-1,y,shine);mark(cx+1,y,dark);}
  }
  return out;
}
