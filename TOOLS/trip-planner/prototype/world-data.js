// Replaceable read-only providers. Requests run only after an explicit user action.
export const CITY_API='https://geocoding-api.open-meteo.com/v1/search';
export const PLACES_API='https://overpass-api.de/api/interpreter';
export const NAMED_PLACE_API='https://nominatim.openstreetmap.org/search';
export const OSM_LOOKUP_API='https://nominatim.openstreetmap.org/lookup';
const timeout=(ms)=>AbortSignal.timeout(ms);
const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
export function localNominatimUrl(url,origin=globalThis.location?.origin){
  if(!origin)return null;
  const base=new URL(origin);
  if(!['localhost','127.0.0.1'].includes(base.hostname)||!['8000','8001'].includes(base.port))return null;
  return new URL(`/api/nominatim${url.pathname}${url.search}`,base).toString();
}
async function fetchNominatim(url,fetcher){
  const upstream=url.toString(),local=fetcher===fetch?localNominatimUrl(url):null;
  if(!local)return fetcher(upstream,{signal:timeout(12000)});
  const response=await fetcher(local,{signal:timeout(16000)});
  // An already-running old static preview server has no proxy route.
  return response.status===404?fetcher(upstream,{signal:timeout(12000)}):response;
}

export function normalizeCities(payload){
  return (Array.isArray(payload?.results)?payload.results:[])
    .filter(x=>finite(x.latitude,-90,90)&&finite(x.longitude,-180,180)&&typeof x.name==='string')
    .map(x=>({id:String(x.id),name:x.name,region:x.admin1||'',country:x.country||x.country_code||'',lat:x.latitude,lng:x.longitude,timezone:x.timezone||''}));
}
export async function searchCities(query,fetcher=fetch){
  const name=String(query||'').trim();
  if(name.length<2)throw new Error('請輸入至少兩個字的城市名稱。');
  const url=new URL(CITY_API);url.searchParams.set('name',name);url.searchParams.set('count','8');url.searchParams.set('language','zh');
  const response=await fetcher(url.toString(),{signal:timeout(12000)});
  if(!response.ok)throw new Error(`城市搜尋暫時無法使用（${response.status}）。`);
  return normalizeCities(await response.json());
}
// A deliberate, separately selected fallback when the primary city service is unavailable.
export function fallbackCityUrl(query){
  const name=String(query||'').trim();
  if(name.length<2||name.length>100)throw new Error('請輸入 2–100 個字的城市名稱。');
  const url=new URL(NAMED_PLACE_API);
  url.searchParams.set('q',name);url.searchParams.set('format','jsonv2');url.searchParams.set('featureType','city');
  url.searchParams.set('addressdetails','1');url.searchParams.set('limit','8');url.searchParams.set('accept-language','zh,en');
  return url;
}
export function normalizeFallbackCities(payload){
  const seen=new Set(),candidates=[];
  const displayPart=value=>String(value||'').split(';').map(part=>part.trim()).filter(Boolean).at(-1)||'';
  return (Array.isArray(payload)?payload:[]).map(item=>{
    const lat=Number(item.lat),lng=Number(item.lon),id=Number(item.osm_id);
    if(!finite(lat,-90,90)||!finite(lng,-180,180)||!Number.isSafeInteger(id)||!['node','way','relation'].includes(item.osm_type))return null;
    const name=displayPart(String(item.name||item.display_name||'').split(',')[0]);
    if(name.length<2)return null;
    const key=`osm-${item.osm_type}-${id}`;if(seen.has(key))return null;seen.add(key);
    return {id:key,name,region:displayPart(item.address?.state||item.address?.region),country:displayPart(item.address?.country),lat,lng,timezone:''};
  }).filter(Boolean).filter(city=>{
    const sameCity=candidates.some(previous=>previous.name.toLocaleLowerCase()===city.name.toLocaleLowerCase()&&previous.country===city.country&&previous.region===city.region&&distance(previous,city)<5);
    if(!sameCity)candidates.push(city);
    return !sameCity;
  });
}
export async function searchFallbackCities(query,fetcher=fetch){
  const response=await fetchNominatim(fallbackCityUrl(query),fetcher);
  if(!response.ok)throw new Error(`替代城市搜尋暫時無法使用（${response.status}）。請稍後再試。`);
  return normalizeFallbackCities(await response.json());
}
export function overpassQuery(city,radius=6000){
  if(!finite(city?.lat,-90,90)||!finite(city?.lng,-180,180))throw new TypeError('Invalid city coordinates');
  const meters=Math.max(1000,Math.min(7000,Math.round(radius)));
  const around=`(around:${meters},${city.lat},${city.lng})`;
  const compact=`(around:3000,${city.lat},${city.lng})`;
  return `[out:json][timeout:25];nwr${around}["name"]["tourism"~"^(museum|gallery|viewpoint|zoo|theme_park)$"];out center 35;nwr${around}["name"]["historic"~"^(castle|monument|memorial|archaeological_site|ruins)$"];out center 25;nwr${around}["name"]["leisure"="park"];out center 20;nwr${around}["name"]["tourism"="attraction"];out center 30;nwr${compact}["name"]["amenity"~"^(restaurant|cafe|food_court|marketplace)$"];out center 18;nwr${compact}["name"]["shop"~"^(mall|department_store)$"];out center 12;`;
}
const placeCategory=tags=>tags.tourism==='museum'||tags.tourism==='gallery'?'室內文化':tags.leisure==='park'?'公園':tags.tourism==='viewpoint'?'展望點':tags.tourism==='zoo'?'動物園':tags.tourism==='theme_park'?'主題樂園':['restaurant','cafe','fast_food','food_court'].includes(tags.amenity)?'餐飲':tags.shop||tags.amenity==='marketplace'?'購物':tags.historic?'歷史地點':tags.natural?'自然景點':'景點';
const quality=tags=>(tags.wikipedia?80:0)+(tags.wikidata?60:0)+(tags.website||tags['contact:website']?25:0)+(tags.tourism==='museum'?30:0)+(tags.tourism==='gallery'?10:0)+(tags.historic==='castle'?25:0)+(tags.leisure==='park'?12:0);
export function normalizePlaces(payload,city){
  const seen=new Set();
  const ranked=(Array.isArray(payload?.elements)?payload.elements:[]).map(x=>{
    const tags=x.tags||{},lat=x.lat??x.center?.lat,lng=x.lon??x.center?.lon,name=tags['name:zh']||tags.name;
    if(!finite(lat,-90,90)||!finite(lng,-180,180)||typeof name!=='string'||name.trim().length<2)return null;
    const id=`${x.type}-${x.id}`;if(seen.has(id))return null;seen.add(id);
    const category=placeCategory(tags),kind=['室內文化','餐飲','購物'].includes(category)?'indoor':['公園','展望點','動物園','主題樂園','自然景點'].includes(category)?'outdoor':'unknown';
    return {id,name:name.trim(),lat,lng,kind,category,minutes:kind==='indoor'?75:60,note:tags.opening_hours?'營業時間請自行核對':'營業資訊未驗證',source:`https://www.openstreetmap.org/${x.type}/${x.id}`,cityId:city.id,quality:quality(tags)};
  }).filter(Boolean).sort((a,b)=>b.quality-a.quality||distance(city,a)-distance(city,b)).filter((place,index,all)=>all.findIndex(other=>other.name.toLocaleLowerCase()===place.name.toLocaleLowerCase()&&distance(other,place)<.35)===index);
  const selected=ranked.slice(0,45),ids=new Set(selected.map(place=>place.id));
  for(const category of ['餐飲','購物','動物園','主題樂園']){
    for(const place of ranked.filter(item=>item.category===category).slice(0,3)){
      if(selected.length>=60)break;
      if(!ids.has(place.id)){selected.push(place);ids.add(place.id);}
    }
  }
  for(const place of ranked){if(selected.length>=60)break;if(!ids.has(place.id)){selected.push(place);ids.add(place.id);}}
  return selected;
}
function distance(a,b){const lat=(a.lat-b.lat)*111,lon=(a.lng-b.lng)*111*Math.cos(a.lat*Math.PI/180);return Math.hypot(lat,lon);}
export async function searchPlaces(city,fetcher=fetch){
  const query=overpassQuery(city);
  const response=await fetcher(`${PLACES_API}?data=${encodeURIComponent(query)}`,{signal:timeout(35000)});
  if(!response.ok)throw new Error(`地點搜尋暫時無法使用（${response.status}）。請稍後重試。`);
  return normalizePlaces(await response.json(),city);
}

// Explicit, single-name lookup only. Public Nominatim forbids autocomplete and
// systematic POI harvesting; the caller must cache and throttle requests.
export function namedPlaceUrl(city,query,scope='nearby'){
  if(!finite(city?.lat,-90,90)||!finite(city?.lng,-180,180))throw new TypeError('Invalid city coordinates');
  const name=String(query||'').trim();
  if(name.length<3||name.length>80)throw new Error('請輸入 3–80 個字的地點名稱。');
  const latDelta=0.36,lngDelta=Math.min(10,0.36/Math.max(.1,Math.cos(city.lat*Math.PI/180)));
  const bounds=[Math.max(-180,city.lng-lngDelta),Math.min(90,city.lat+latDelta),Math.min(180,city.lng+lngDelta),Math.max(-90,city.lat-latDelta)];
  const url=new URL(NAMED_PLACE_API);
  url.searchParams.set('q',name);url.searchParams.set('format','jsonv2');url.searchParams.set('limit','8');
  url.searchParams.set('viewbox',bounds.join(','));url.searchParams.set('bounded',scope==='wider'?'0':'1');
  url.searchParams.set('namedetails','1');url.searchParams.set('extratags','1');url.searchParams.set('accept-language','zh,en');
  return url;
}
export function normalizeNamedPlaces(payload,city,query=''){
  const seen=new Set();
  return (Array.isArray(payload)?payload:[]).map(item=>{
    const lat=Number(item.lat),lng=Number(item.lon),type=item.osm_type,id=Number(item.osm_id);
    if(!finite(lat,-90,90)||!finite(lng,-180,180)||!['node','way','relation'].includes(type)||!Number.isSafeInteger(id))return null;
    const group=item.category||item.class||'',subtype=item.type||'';
    if(!['tourism','historic','leisure','natural','amenity','shop','man_made','building'].includes(group))return null;
    const name=item.namedetails?.['name:zh']||item.namedetails?.name||item.name||String(item.display_name||'').split(',')[0].trim();
    if(typeof name!=='string'||name.length<2)return null;
    const sought=query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
    const aliases=[name,...Object.values(item.namedetails||{}).filter(value=>typeof value==='string')];
    if(sought&&!aliases.some(alias=>alias.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().includes(sought)))return null;
    const key=`${type}-${id}`;if(seen.has(key))return null;seen.add(key);
    const category=placeCategory({[group]:subtype});
    const kind=['室內文化','餐飲','購物'].includes(category)?'indoor':['公園','展望點','自然景點','動物園','主題樂園'].includes(category)?'outdoor':'unknown';
    return {id:key,name,lat,lng,kind,category,minutes:60,note:'營業資訊未驗證',source:`https://www.openstreetmap.org/${type}/${id}`,cityId:city.id,quality:quality(item.extratags||{}),importance:Number(item.importance)||0};
  }).filter(Boolean);
}
export async function searchNamedPlaces(city,query,fetcher=fetch,scope='nearby'){
  const response=await fetchNominatim(namedPlaceUrl(city,query,scope),fetcher);
  if(!response.ok)throw new Error(`具名地點搜尋暫時無法使用（${response.status}）。請稍後再試。`);
  const places=normalizeNamedPlaces(await response.json(),city,query);
  return scope==='wider'?places.filter(place=>distance(city,place)<=120):places;
}

export function parseOsmPlaceUrl(value){
  let url;try{url=new URL(String(value||'').trim());}catch{throw new Error('請貼上 OpenStreetMap 的 node、way 或 relation 地點連結。');}
  if(url.protocol!=='https:'||!['openstreetmap.org','www.openstreetmap.org','osm.org','www.osm.org'].includes(url.hostname))throw new Error('只接受 OpenStreetMap 官方地點連結。');
  const match=url.pathname.match(/^\/(node|way|relation)\/([1-9]\d*)\/?$/);
  if(!match||!Number.isSafeInteger(Number(match[2])))throw new Error('連結需要包含 node、way 或 relation 的有效編號。');
  return {type:match[1],id:Number(match[2])};
}
export function osmLookupUrl(value){
  const {type,id}=parseOsmPlaceUrl(value),url=new URL(OSM_LOOKUP_API);
  url.searchParams.set('osm_ids',`${{node:'N',way:'W',relation:'R'}[type]}${id}`);
  url.searchParams.set('format','jsonv2');url.searchParams.set('namedetails','1');url.searchParams.set('extratags','1');url.searchParams.set('accept-language','zh,en');
  return url;
}
export async function lookupOsmPlace(city,value,fetcher=fetch){
  const {type,id}=parseOsmPlaceUrl(value);
  const response=await fetchNominatim(osmLookupUrl(value),fetcher);
  if(!response.ok)throw new Error(`OSM 地點查詢暫時無法使用（${response.status}）。`);
  const place=normalizeNamedPlaces(await response.json(),city).find(item=>item.id===`${type}-${id}`);
  if(!place)throw new Error('找不到可加入行程的具名 OSM 地點。');
  if(distance(city,place)>120)throw new Error('這個地點離所選城市超過 120 公里；請先選擇較近的城市。');
  return place;
}

export function mergePlaces(nearby,alreadyAdded){
  const seen=new Set();
  return [...nearby,...alreadyAdded].filter(place=>{
    if(seen.has(place.id))return false;
    seen.add(place.id);return true;
  });
}
