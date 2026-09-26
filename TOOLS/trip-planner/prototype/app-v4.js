import {dimensions,adjectives,tripDNA,parseAdjustment} from './engine.js';
import {searchCities,searchFallbackCities,searchPlaces,searchNamedPlaces,mergePlaces} from './world-data.js';
import {buildWorldTrip,groupPlaceIds,sameTripSelection,km,mapUrl,directionsUrl,suggestedPlaceIds,rankPlaces} from './world-planner.js';
import {fetchRoadRoute} from './route-data.js';

const $=id=>document.getElementById(id);
const element=(tag,className='',text='')=>{const item=document.createElement(tag);item.className=className;item.textContent=text;return item;};
const draftKey='trip-planner-world-v1',placeCachePrefix='trip-planner-places-v3-';
const words=new Set(),selectedIds=new Set();
let city=null,catalog=[],trip=null,activeDay=0,adjustments=[],routeChoices=[],expandedRoutes=[],lookupSerial=0,selectionTouched=false;
let namedLookupAt=0,namedLookupSerial=0;
let roadLookupAt=0;
const cityCachePrefix='trip-planner-cities-v1-';
const fallbackCityButton=element('button','hidden','改用 OpenStreetMap 搜尋城市');fallbackCityButton.type='button';
$('searchCity').parentElement.after(fallbackCityButton);

const namedSearch=element('div','named-search');
const namedLabel=element('label','', '找不到想去的地點？輸入名稱搜尋');
const namedInput=element('input');namedInput.id='namedPlace';namedInput.placeholder='例如 Tour Eiffel';namedInput.maxLength=80;
const namedButton=element('button','','搜尋具名地點');namedButton.type='button';
const widerButton=element('button','secondary hidden','擴大範圍再查一次');widerButton.type='button';
const namedStatus=element('p','hint');namedStatus.setAttribute('role','status');
const namedResults=element('div','city-results');
const namedHelp=element('p','muted','具名搜尋由 OpenStreetMap 公共服務提供，僅在按下按鈕時查詢；低流量本機測試用。');
const policyLink=element('a','','使用政策');policyLink.href='https://operations.osmfoundation.org/policies/nominatim/';policyLink.target='_blank';policyLink.rel='noopener noreferrer';namedHelp.append(' ',policyLink);
namedLabel.append(namedInput);namedSearch.append(namedLabel,namedButton,widerButton,namedStatus,namedResults,namedHelp);
$('placeStage').insertBefore(namedSearch,$('placeFilter').parentElement);
const itineraryEditStatus=element('p','hint');itineraryEditStatus.setAttribute('role','status');$('schedule').before(itineraryEditStatus);

function show(id){
  for(const name of ['feel','conditions','result'])$(name).classList.toggle('hidden',name!==id);
  ['feel','conditions','result'].forEach((name,i)=>$(`step${i+1}`).classList.toggle('active',name===id));
  window.scrollTo(0,0);
}
function save(){
  if(!trip)return;
  try{sessionStorage.setItem(draftKey,JSON.stringify({trip,city,catalog,words:[...words],activeDay,adjustments,routeChoices}));}catch{}
}
function renderDNA(){
  const box=$('dnaBars');box.replaceChildren();
  for(const [key,label] of Object.entries(dimensions)){
    const value=tripDNA(words).weights[key],row=element('div','barrow'),track=element('div','track'),fill=element('div','fill');
    fill.style.width=`${value}%`;track.append(fill);row.append(element('span','',label),track,element('strong','',String(value)));box.append(row);
  }
}
for(const word of Object.keys(adjectives)){
  const button=element('button','chip',word);button.type='button';button.setAttribute('aria-pressed','false');
  button.onclick=()=>{words.has(word)?words.delete(word):words.add(word);button.setAttribute('aria-pressed',String(words.has(word)));renderDNA();if(catalog.length){if(!selectionTouched){selectedIds.clear();suggestedPlaceIds(catalog,[...words]).forEach(id=>selectedIds.add(id));}renderPlaces();}};
  $('chips').append(button);
}
renderDNA();
const tomorrow=new Date(Date.now()+86400000);
$('date').value=`${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
$('next').onclick=()=>show('conditions');$('back').onclick=()=>show('feel');$('editTrip').onclick=()=>show('conditions');
$('restart').onclick=()=>{
  ++lookupSerial;++namedLookupSerial;
  trip=null;city=null;catalog=[];activeDay=0;adjustments=[];routeChoices=[];expandedRoutes=[];selectionTouched=false;selectedIds.clear();words.clear();
  sessionStorage.removeItem(draftKey);$('destination').value='';$('cityResults').replaceChildren();$('placeStage').classList.add('hidden');$('placeFilter').value='';$('cityStatus').textContent='';$('formError').textContent='';
  fallbackCityButton.classList.add('hidden');
  namedInput.value='';namedStatus.textContent='';namedResults.replaceChildren();widerButton.classList.add('hidden');
  $('days').value='3';$('travelers').value='2';$('budget').value='0';$('currency').value='TWD';
  for(const chip of $('chips').children)chip.setAttribute('aria-pressed','false');renderDNA();show('feel');
};

function cityLabel(item){return [item.name,item.region,item.country].filter(Boolean).join(' · ');}
function setCityStatus(message,isError=false){$('cityStatus').textContent=message;$('cityStatus').classList.toggle('error',isError);}
function countPlaces(){$('placeCount').textContent=`已選 ${selectedIds.size} 個地點；清單共 ${catalog.length} 個。` ;}
function renderPlaces(){
  const box=$('placeChoices'),filter=$('placeFilter').value.trim().toLocaleLowerCase();box.replaceChildren();
  for(const {place,reasons} of rankPlaces(catalog,[...words]).filter(({place})=>!filter||place.name.toLocaleLowerCase().includes(filter)||place.category.includes(filter))){
    const label=element('label','place-choice'),checkbox=element('input');checkbox.type='checkbox';checkbox.value=place.id;checkbox.checked=selectedIds.has(place.id);
    checkbox.onchange=()=>{selectionTouched=true;checkbox.checked?selectedIds.add(place.id):selectedIds.delete(place.id);countPlaces();};
    const details=element('span','place-body');
    details.append(element('strong','',`${place.name} · ${place.category} · ${place.kind==='indoor'?'室內':place.kind==='outdoor'?'戶外':'環境待查'}`),element('small','',reasons.join('；')));
    label.append(checkbox,details);box.append(label);
  }
  if(!box.children.length)box.append(element('p','muted','沒有符合篩選的地點。'));
  countPlaces();
}
$('placeFilter').oninput=renderPlaces;
async function lookupNamedPlace(scope='nearby'){
  if(!city){namedStatus.textContent='請先選擇城市。';return;}
  const query=namedInput.value.trim(),cityId=city.id,citySerial=lookupSerial,serial=++namedLookupSerial;
  namedResults.replaceChildren();namedStatus.textContent='正在查詢具名地點…';
  if(query.length<3){namedStatus.textContent='請輸入至少 3 個字的地點名稱。';return;}
  const cacheKey=`trip-planner-named-v3-${scope}-${cityId}-${query.toLocaleLowerCase()}`;
  let places;try{const cached=JSON.parse(sessionStorage.getItem(cacheKey));if(cached?.savedAt>Date.now()-86400000&&Array.isArray(cached.places))places=cached.places;}catch{}
  if(!places&&Date.now()-namedLookupAt<1100){namedStatus.textContent='公共地點服務每秒至多查詢一次，請稍候再按。';return;}
  namedButton.disabled=true;widerButton.disabled=true;widerButton.classList.add('hidden');
  try{
    if(!places){namedLookupAt=Date.now();places=await searchNamedPlaces(city,query,fetch,scope);try{sessionStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),places}));}catch{}}
    if(serial!==namedLookupSerial||citySerial!==lookupSerial||city?.id!==cityId)return;
    if(!places.length&&scope==='nearby')widerButton.classList.remove('hidden');
    if(!places.length&&scope==='wider'){namedStatus.textContent='擴大查詢仍沒有找到 120 公里內的同名地點；可試當地語言或完整名稱。';return;}
    if(!places.length){namedStatus.textContent='附近沒有查到符合名稱的具名地點；可按下方按鈕擴大範圍，或改用當地語言再試。';return;}
    namedStatus.textContent=`找到 ${places.length} 個可能地點，點選後加入行程候選；名稱與位置請自行核對。`;
    for(const place of places){
      const candidate=element('button','city-choice',`${place.name} · ${place.category} · 距城市中心約 ${km(city,place).toFixed(1)} km`);
      candidate.type='button';candidate.onclick=()=>{
        if(!catalog.some(item=>item.id===place.id))catalog.push(place);
        selectedIds.add(place.id);selectionTouched=true;$('placeFilter').value='';renderPlaces();
        namedStatus.textContent=`已加入「${place.name}」。請核對位置、營業資訊與可達性。`;
        namedResults.replaceChildren();
      };
      namedResults.append(candidate);
    }
  }catch(error){if(serial===namedLookupSerial)namedStatus.textContent=error.message||'地點搜尋失敗，請稍後重試。';}
  finally{namedButton.disabled=false;widerButton.disabled=false;}
}
namedButton.onclick=()=>lookupNamedPlace();
widerButton.onclick=()=>lookupNamedPlace('wider');
namedInput.addEventListener('input',()=>{widerButton.classList.add('hidden');namedResults.replaceChildren();namedStatus.textContent='';++namedLookupSerial;});
namedInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();namedButton.click();}});
async function chooseCity(item){
  const serial=++lookupSerial;++namedLookupSerial;city=item;catalog=[];selectedIds.clear();selectionTouched=false;
  namedInput.value='';namedStatus.textContent='';namedResults.replaceChildren();widerButton.classList.add('hidden');
  $('cityResults').replaceChildren();$('chosenCity').textContent=cityLabel(item);$('placeFilter').value='';renderPlaces();$('placeStage').classList.remove('hidden');
  setCityStatus(`已選擇 ${cityLabel(item)}。可立即搜尋具名地點；附近清單正在背景載入…`);
  try{
    const cacheKey=placeCachePrefix+item.id;
    let result;try{const cached=JSON.parse(sessionStorage.getItem(cacheKey));if(cached?.savedAt>Date.now()-86400000&&Array.isArray(cached.places))result=cached.places;}catch{}
    if(!result){result=await searchPlaces(item);try{sessionStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),places:result}));}catch{}}
    if(serial!==lookupSerial)return;
    catalog=mergePlaces(result,catalog);
    if(!selectionTouched){selectedIds.clear();suggestedPlaceIds(catalog,[...words]).forEach(id=>selectedIds.add(id));}
    renderPlaces();if(trip?.city?.id===city.id)save();
    setCityStatus(result.length?`附近查到 ${result.length} 個具名地點；自行加入的地點已保留。偏好排序僅依可用證據。`:'附近清單沒有結果；仍可搜尋想去的具名地點。');
  }catch(error){if(serial===lookupSerial){
    setCityStatus('附近清單暫時無法載入；仍可依名稱搜尋地點，或換個城市再試。',true);
  }}
}
$('searchCity').onclick=async()=>{
  const query=$('destination').value.trim(),serial=++lookupSerial,button=$('searchCity');++namedLookupSerial;
  city=null;catalog=[];selectedIds.clear();$('placeStage').classList.add('hidden');$('cityResults').replaceChildren();
  fallbackCityButton.classList.add('hidden');
  button.disabled=true;setCityStatus('正在搜尋城市…');
  try{
    const cacheKey=cityCachePrefix+`primary-${query.toLocaleLowerCase()}`;
    let results;try{const cached=JSON.parse(sessionStorage.getItem(cacheKey));if(cached?.savedAt>Date.now()-86400000&&Array.isArray(cached.results))results=cached.results;}catch{}
    if(!results){results=await searchCities(query);try{sessionStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),results}));}catch{}}
    if(serial!==lookupSerial)return;
    if(!results.length){setCityStatus('找不到這個城市。請加上國家名稱再試一次。',true);return;}
    setCityStatus('請選擇正確的城市與國家：');
    for(const item of results){const candidate=element('button','city-choice',cityLabel(item));candidate.type='button';candidate.onclick=()=>chooseCity(item);$('cityResults').append(candidate);}
  }catch(error){if(serial===lookupSerial){setCityStatus(`${error.message||'城市搜尋失敗。'} 可按下方按鈕改用 OpenStreetMap 查詢。`,true);fallbackCityButton.classList.remove('hidden');}}
  finally{button.disabled=false;}
};
fallbackCityButton.onclick=async()=>{
  const query=$('destination').value.trim(),serial=++lookupSerial;++namedLookupSerial;
  if(query.length<2){setCityStatus('請輸入至少兩個字的城市名稱。',true);return;}
  const cacheKey=cityCachePrefix+`fallback-${query.toLocaleLowerCase()}`;
  let results;try{const cached=JSON.parse(sessionStorage.getItem(cacheKey));if(cached?.savedAt>Date.now()-86400000&&Array.isArray(cached.results))results=cached.results;}catch{}
  if(!results&&Date.now()-namedLookupAt<1100){setCityStatus('OpenStreetMap 公共服務每秒至多查詢一次，請稍候再按。',true);return;}
  fallbackCityButton.disabled=true;$('cityResults').replaceChildren();setCityStatus('正在使用 OpenStreetMap 搜尋城市…');
  try{
    if(!results){namedLookupAt=Date.now();results=await searchFallbackCities(query);try{sessionStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),results}));}catch{}}
    if(serial!==lookupSerial)return;
    if(!results.length){setCityStatus('替代服務也找不到符合的城市；請加上國家名稱或稍後重試。',true);return;}
    setCityStatus('請核對替代服務找到的城市與國家：');fallbackCityButton.classList.add('hidden');
    for(const item of results){const candidate=element('button','city-choice',cityLabel(item));candidate.type='button';candidate.onclick=()=>chooseCity(item);$('cityResults').append(candidate);}
  }catch(error){if(serial===lookupSerial)setCityStatus(error.message||'替代城市搜尋失敗，請稍後重試。',true);}
  finally{fallbackCityButton.disabled=false;}
};
$('destination').addEventListener('input',()=>fallbackCityButton.classList.add('hidden'));
$('destination').addEventListener('input',()=>{city=null;catalog=[];selectedIds.clear();$('placeStage').classList.add('hidden');$('cityResults').replaceChildren();setCityStatus('名稱已變更，請重新搜尋並選擇城市。');});
$('destination').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('searchCity').click();}});

// Discard delayed results for a city name the user has already changed.
$('destination').addEventListener('input',()=>{++lookupSerial;++namedLookupSerial;namedResults.replaceChildren();namedStatus.textContent='';widerButton.classList.add('hidden');});
function selectedPlaces(){return [...selectedIds].filter(id=>catalog.some(p=>p.id===id));}
function tripDays(){return buildWorldTrip({...trip,catalog},tripDNA(words),adjustments);}
function dateLabel(index){const date=new Date(`${trip.date}T12:00:00`);date.setDate(date.getDate()+index);return `${date.getMonth()+1}/${date.getDate()}`;}
const clock=minutes=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
function renderSummary(){
  $('resultTitle').textContent=`${city.name} · ${trip.date} 起 ${trip.days} 天`;
  $('summary').textContent=`${cityLabel(city)} · ${trip.travelers} 人 · ${trip.placeIds.length} 個所選地點 · ${trip.budget?`紀錄預算 ${trip.budget.toLocaleString()} ${trip.currency}（尚未計價）`:'預算未設定'} · 偏好：${[...words].join('、')||'均衡'}`;
}
$('tripForm').onsubmit=event=>{
  event.preventDefault();$('formError').textContent='';if(!event.currentTarget.reportValidity())return;
  if(!city||!catalog.length){$('formError').textContent='請先搜尋並選擇城市，等候地點載入。';return;}
  const ids=selectedPlaces(),days=Number($('days').value);
  if(ids.length<days||ids.length>days*4){$('formError').textContent=`${days} 天請選 ${days}–${days*4} 個地點；目前選了 ${ids.length} 個。`;return;}
  const updated={city,destination:city.name,date:$('date').value,days,travelers:Number($('travelers').value),budget:Number($('budget').value),currency:$('currency').value.toUpperCase(),placeIds:ids,preferenceWords:[...words]};
  const keepPlan=sameTripSelection(trip,updated);
  const samePreferences=keepPlan&&JSON.stringify(trip.preferenceWords)===JSON.stringify(updated.preferenceWords);
  updated.dayPlaceIds=keepPlan&&trip.dayPlaceIds?trip.dayPlaceIds:groupPlaceIds({...updated,catalog}).map(group=>group.map(place=>place.id));
  trip=updated;itineraryEditStatus.textContent=keepPlan?'已保留原有地點順序與每日安排。':'';
  if(!keepPlan){activeDay=0;adjustments=Array.from({length:days},()=>({}));routeChoices=Array.from({length:days},()=>[]);expandedRoutes=Array.from({length:days},()=>[]);}
  else if(!samePreferences){routeChoices=Array.from({length:days},()=>[]);expandedRoutes=Array.from({length:days},()=>[]);itineraryEditStatus.textContent='已保留每日安排，並依新的旅行偏好重新選擇交通。';}
  renderSummary();renderTrip();save();show('result');
};
function renderTabs(){
  const box=$('dayTabs');box.replaceChildren();
  for(let i=0;i<trip.days;i++){const button=element('button','day-tab',`第 ${i+1} 天 · ${dateLabel(i)}`);button.type='button';button.setAttribute('aria-pressed',String(i===activeDay));button.onclick=()=>{activeDay=i;$('preview').replaceChildren();renderTrip();save();};box.append(button);}
}
function editDayPlace(index,targetDay,targetIndex){
  const groups=trip.dayPlaceIds,source=groups[activeDay],id=source[index];
  if(!id)return;
  if(targetDay!==activeDay){
    if(source.length===1){itineraryEditStatus.textContent='每一天至少要保留一個地點。';return;}
    if(groups[targetDay].length===4){itineraryEditStatus.textContent='每一天最多安排四個地點。';return;}
    source.splice(index,1);groups[targetDay].push(id);
    itineraryEditStatus.textContent=`已移至第 ${targetDay+1} 天。`;
  }else{
    if(targetIndex<0||targetIndex>=source.length)return;
    source.splice(index,1);source.splice(targetIndex,0,id);
    itineraryEditStatus.textContent='已調整當天地點順序。';
  }
  adjustments=Array.from({length:trip.days},()=>({}));routeChoices=Array.from({length:trip.days},()=>[]);expandedRoutes=Array.from({length:trip.days},()=>[]);
  $('preview').replaceChildren();renderTrip();save();
}
function renderTrip(){
  renderTabs();const day=tripDays()[activeDay],box=$('schedule');box.replaceChildren();
  box.append(element('h3','',`第 ${activeDay+1} 天 · ${day.stops.length} 個地點`));
  if(adjustments[activeDay]?.rain||adjustments[activeDay]?.tired){
    const clear=element('button','route-toggle','清除這一天的臨時調整，以編輯地點順序');clear.type='button';
    clear.onclick=()=>{adjustments[activeDay]={};routeChoices[activeDay]=[];itineraryEditStatus.textContent='已清除這一天的臨時調整。';renderTrip();save();};box.append(clear);
  }
  if(day.stops.length===1)box.append(element('p','hint','今天只安排一站；可回到地點選擇增加內容。'));
  let cursor=600;
  day.stops.forEach((stop,index)=>{
    const card=element('article','stop');card.append(element('time','',`建議 ${clock(cursor)}`),element('h3','',stop.name),element('p','',`${stop.category} · 建議停留約 ${stop.minutes} 分 · ${stop.note}`));
    const link=element('a','map-link','地圖與來源 ↗');link.href=stop.source||mapUrl(stop);link.target='_blank';link.rel='noopener noreferrer';card.append(link);
    if(stop.rainReplacement)card.append(element('p','hint','雨天替換：附近未排入的室內地點'));
    if(!adjustments[activeDay]?.rain&&!adjustments[activeDay]?.tired){
      const controls=element('div','stop-controls');
      for(const [label,offset] of [['上移',-1],['下移',1]]){
        const move=element('button','',label);move.type='button';move.disabled=index+offset<0||index+offset>=day.stops.length;
        move.setAttribute('aria-label',`${stop.name}${label}`);move.onclick=()=>editDayPlace(index,activeDay,index+offset);controls.append(move);
      }
      if(trip.days>1){
        const label=element('label','move-day-label','移至其他天');const select=element('select');select.setAttribute('aria-label',`${stop.name}移至其他天`);
        const placeholder=element('option','','選擇日期');placeholder.value='';select.append(placeholder);
        for(let dayIndex=0;dayIndex<trip.days;dayIndex++)if(dayIndex!==activeDay){const option=element('option','',`第 ${dayIndex+1} 天`);option.value=String(dayIndex);select.append(option);}
        select.onchange=()=>{editDayPlace(index,Number(select.value));select.value='';};label.append(select);controls.append(label);
      }
      card.append(controls);
    }
    box.append(card);
    const leg=day.legs[index];if(!leg)return;
    const next=day.stops[index+1],section=element('section','leg');section.append(element('h4','',`前往 ${next.name} · 直線約 ${km(stop,next).toFixed(1)} km`));
    section.append(element('p','hint','候選交通是距離模型，是否有班次／道路及實際票價須查證。'));
    const list=element('div','route-list');let selected=routeChoices[activeDay][index]??0;if(selected>=leg.options.length)selected=0;
    leg.options.forEach((route,optionIndex)=>{
      if(!expandedRoutes[activeDay]?.[index]&&optionIndex!==selected)return;
      const label=element('label',`route-option${selected===optionIndex?' selected':''}`),radio=element('input');radio.type='radio';radio.name=`route-${activeDay}-${index}`;radio.checked=selected===optionIndex;
      radio.onchange=()=>{routeChoices[activeDay][index]=optionIndex;renderTrip();save();};
      const body=element('span','route-body');body.append(element('strong','',`${route.mode} · 約 ${route.duration_min} 分`),element('small','',`Money 待查 · Time 約 ${route.duration_min} 分`),element('small','',`Energy ${route.energy_score}/100 · Friction ${route.friction_score}/100 · 步行約 ${route.walking_min} 分`));
      label.append(radio,body);list.append(label);
    });
    section.append(list);
    const roadButton=element('button','route-toggle','查開車道路時間（OSRM）');roadButton.type='button';
    const roadStatus=element('p','hint');roadStatus.setAttribute('role','status');
    roadButton.onclick=async()=>{
      const key=`trip-planner-road-v1-${stop.lat.toFixed(5)},${stop.lng.toFixed(5)}-${next.lat.toFixed(5)},${next.lng.toFixed(5)}`;
      let result;try{const cached=JSON.parse(sessionStorage.getItem(key));if(cached?.savedAt>Date.now()-86400000&&cached.route?.mode==='car')result=cached.route;}catch{}
      if(!result&&Date.now()-roadLookupAt<1100){roadStatus.textContent='公共道路服務每秒至多查詢一次，請稍候再按。';return;}
      roadButton.disabled=true;roadStatus.textContent='正在查詢開車道路時間…';
      try{
        if(!result){roadLookupAt=Date.now();result=await fetchRoadRoute(stop,next);try{sessionStorage.setItem(key,JSON.stringify({savedAt:Date.now(),route:result}));}catch{}}
        roadStatus.textContent=`OSRM 道路路線約 ${result.distanceKm.toFixed(1)} km、純行車 ${result.minutes} 分；不含等車、停車或塞車，也不取代上方距離模型與實際票價查證。`;
      }catch(error){roadStatus.textContent=error.message||'道路查詢失敗；原本交通時間仍是距離模型估算。';}
      finally{roadButton.disabled=false;}
    };
    section.append(roadButton,roadStatus);
    const roadSource=element('a','map-link','道路資料：OSRM / OpenStreetMap');roadSource.href='https://routing.openstreetmap.de/about.html';roadSource.target='_blank';roadSource.rel='noopener noreferrer';section.append(roadSource);
    const routeLink=element('a','map-link','查詢實際路線 ↗');routeLink.href=directionsUrl(stop,next);routeLink.target='_blank';routeLink.rel='noopener noreferrer';section.append(routeLink);box.append(section);
    if(leg.options.length>1){
      const toggle=element('button','route-toggle',expandedRoutes[activeDay]?.[index]?'收合其他交通方案':`比較其他 ${leg.options.length-1} 種交通方案`);
      toggle.type='button';toggle.setAttribute('aria-expanded',String(Boolean(expandedRoutes[activeDay]?.[index])));
      toggle.onclick=()=>{expandedRoutes[activeDay]??=[];expandedRoutes[activeDay][index]=!expandedRoutes[activeDay][index];renderTrip();};
      section.insertBefore(toggle,routeLink);
    }
    cursor+=stop.minutes+30+leg.options[selected].duration_min;
  });
}
$('adjustForm').onsubmit=event=>{
  event.preventDefault();const intent=parseAdjustment($('adjust').value),preview=$('preview');preview.replaceChildren();
  if(!intent.tired&&!intent.rain){preview.append(element('p','error','目前可處理「累了／少走路」或「下雨」；其他要求尚需 AI 解析器。'));return;}
  const effects=[intent.tired?'減少當天最後一站並排除純步行':null,intent.rain?'嘗試改成附近未使用的室內地點':null].filter(Boolean).join('；');
  preview.append(element('p','preview',effects));const button=element('button','primary','套用到這一天');button.type='button';button.onclick=()=>{adjustments[activeDay]={...adjustments[activeDay],...intent};routeChoices[activeDay]=[];renderTrip();save();preview.replaceChildren(element('p','preview','已套用。若附近沒有可用室內點，戶外點會保留並提醒查證。'));};preview.append(button);
};
try{
  const saved=JSON.parse(sessionStorage.getItem(draftKey));
  if(saved?.trip?.city&&Array.isArray(saved.catalog)&&saved.catalog.length&&Array.isArray(saved.trip.placeIds)&&saved.trip.days>=1&&saved.trip.days<=6){
    city=saved.city;catalog=saved.catalog;trip=saved.trip;if(!trip.dayPlaceIds)trip.dayPlaceIds=groupPlaceIds({...trip,catalog}).map(group=>group.map(place=>place.id));
    groupPlaceIds({...trip,catalog});
    activeDay=Math.min(Math.max(0,saved.activeDay||0),trip.days-1);adjustments=Array.isArray(saved.adjustments)?saved.adjustments:Array.from({length:trip.days},()=>({}));routeChoices=Array.isArray(saved.routeChoices)?saved.routeChoices:Array.from({length:trip.days},()=>[]);
    for(const word of saved.words||[])if(Object.hasOwn(adjectives,word))words.add(word);
    for(const chip of $('chips').children)chip.setAttribute('aria-pressed',String(words.has(chip.textContent)));
    $('destination').value=city.name;$('chosenCity').textContent=cityLabel(city);$('placeStage').classList.remove('hidden');
    for(const id of trip.placeIds)selectedIds.add(id);selectionTouched=true;renderPlaces();
    for(const id of ['date','days','travelers','budget','currency'])$(id).value=trip[id];
    renderDNA();renderSummary();renderTrip();show('result');
  }
}catch{}
