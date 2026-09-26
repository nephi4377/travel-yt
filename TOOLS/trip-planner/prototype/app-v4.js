import {dimensions,adjectives,tripDNA,parseAdjustment} from './engine.js';
import {searchCities,searchPlaces} from './world-data.js';
import {buildWorldTrip,km,mapUrl,directionsUrl,suggestedPlaceIds} from './world-planner.js';

const $=id=>document.getElementById(id);
const element=(tag,className='',text='')=>{const item=document.createElement(tag);item.className=className;item.textContent=text;return item;};
const draftKey='trip-planner-world-v1',placeCachePrefix='trip-planner-places-v3-';
const words=new Set(),selectedIds=new Set();
let city=null,catalog=[],trip=null,activeDay=0,adjustments=[],routeChoices=[],lookupSerial=0;

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
  button.onclick=()=>{words.has(word)?words.delete(word):words.add(word);button.setAttribute('aria-pressed',String(words.has(word)));renderDNA();};
  $('chips').append(button);
}
renderDNA();
const tomorrow=new Date(Date.now()+86400000);
$('date').value=`${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
$('next').onclick=()=>show('conditions');$('back').onclick=()=>show('feel');$('editTrip').onclick=()=>show('conditions');
$('restart').onclick=()=>{
  trip=null;city=null;catalog=[];activeDay=0;adjustments=[];routeChoices=[];selectedIds.clear();words.clear();
  sessionStorage.removeItem(draftKey);$('destination').value='';$('cityResults').replaceChildren();$('placeStage').classList.add('hidden');$('placeFilter').value='';$('cityStatus').textContent='';$('formError').textContent='';
  $('days').value='3';$('travelers').value='2';$('budget').value='0';$('currency').value='TWD';
  for(const chip of $('chips').children)chip.setAttribute('aria-pressed','false');renderDNA();show('feel');
};

function cityLabel(item){return [item.name,item.region,item.country].filter(Boolean).join(' · ');}
function setCityStatus(message,isError=false){$('cityStatus').textContent=message;$('cityStatus').classList.toggle('error',isError);}
function countPlaces(){$('placeCount').textContent=`已選 ${selectedIds.size} 個地點；清單共 ${catalog.length} 個。` ;}
function renderPlaces(){
  const box=$('placeChoices'),filter=$('placeFilter').value.trim().toLocaleLowerCase();box.replaceChildren();
  for(const place of catalog.filter(p=>!filter||p.name.toLocaleLowerCase().includes(filter)||p.category.includes(filter))){
    const label=element('label','place-choice'),checkbox=element('input');checkbox.type='checkbox';checkbox.value=place.id;checkbox.checked=selectedIds.has(place.id);
    checkbox.onchange=()=>{checkbox.checked?selectedIds.add(place.id):selectedIds.delete(place.id);countPlaces();};
    label.append(checkbox,element('span','',`${place.name} · ${place.category} · ${place.kind==='indoor'?'室內':place.kind==='outdoor'?'戶外':'環境待查'}`));box.append(label);
  }
  if(!box.children.length)box.append(element('p','muted','沒有符合篩選的地點。'));
  countPlaces();
}
$('placeFilter').oninput=renderPlaces;
async function chooseCity(item){
  const serial=++lookupSerial;city=item;catalog=[];selectedIds.clear();$('placeStage').classList.add('hidden');
  $('cityResults').replaceChildren();setCityStatus(`正在查詢 ${cityLabel(item)} 附近的地點…`);
  try{
    const cacheKey=placeCachePrefix+item.id;
    let result;try{const cached=JSON.parse(sessionStorage.getItem(cacheKey));if(cached?.savedAt>Date.now()-86400000&&Array.isArray(cached.places))result=cached.places;}catch{}
    if(!result){result=await searchPlaces(item);try{sessionStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),places:result}));}catch{}}
    if(serial!==lookupSerial)return;
    catalog=result;selectedIds.clear();suggestedPlaceIds(catalog,[...words]).forEach(id=>selectedIds.add(id));
    $('chosenCity').textContent=cityLabel(item);$('placeFilter').value='';renderPlaces();$('placeStage').classList.remove('hidden');
    setCityStatus(catalog.length?`查到 ${catalog.length} 個具名地點，優先顯示資料較完整者；請確認想去的地方。`:'這個中心區域沒有查到符合條件的具名景點，請選另一城市或稍後重試。');
  }catch(error){if(serial===lookupSerial){city=null;setCityStatus(error.message||'地點搜尋失敗，請稍後重試。',true);}}
}
$('searchCity').onclick=async()=>{
  const query=$('destination').value.trim(),serial=++lookupSerial,button=$('searchCity');
  city=null;catalog=[];selectedIds.clear();$('placeStage').classList.add('hidden');$('cityResults').replaceChildren();
  button.disabled=true;setCityStatus('正在搜尋城市…');
  try{
    const results=await searchCities(query);if(serial!==lookupSerial)return;
    if(!results.length){setCityStatus('找不到這個城市。請加上國家名稱再試一次。',true);return;}
    setCityStatus('請選擇正確的城市與國家：');
    for(const item of results){const candidate=element('button','city-choice',cityLabel(item));candidate.type='button';candidate.onclick=()=>chooseCity(item);$('cityResults').append(candidate);}
  }catch(error){if(serial===lookupSerial)setCityStatus(error.message||'城市搜尋失敗，請稍後重試。',true);}
  finally{button.disabled=false;}
};
$('destination').addEventListener('input',()=>{city=null;catalog=[];selectedIds.clear();$('placeStage').classList.add('hidden');$('cityResults').replaceChildren();setCityStatus('名稱已變更，請重新搜尋並選擇城市。');});
$('destination').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('searchCity').click();}});

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
  trip={city,destination:city.name,date:$('date').value,days,travelers:Number($('travelers').value),budget:Number($('budget').value),currency:$('currency').value.toUpperCase(),placeIds:ids};
  activeDay=0;adjustments=Array.from({length:days},()=>({}));routeChoices=Array.from({length:days},()=>[]);
  renderSummary();renderTrip();save();show('result');
};
function renderTabs(){
  const box=$('dayTabs');box.replaceChildren();
  for(let i=0;i<trip.days;i++){const button=element('button','day-tab',`第 ${i+1} 天 · ${dateLabel(i)}`);button.type='button';button.setAttribute('aria-pressed',String(i===activeDay));button.onclick=()=>{activeDay=i;$('preview').replaceChildren();renderTrip();save();};box.append(button);}
}
function renderTrip(){
  renderTabs();const day=tripDays()[activeDay],box=$('schedule');box.replaceChildren();
  box.append(element('h3','',`第 ${activeDay+1} 天 · ${day.stops.length} 個地點`));
  if(day.stops.length===1)box.append(element('p','hint','今天只安排一站；可回到地點選擇增加內容。'));
  let cursor=600;
  day.stops.forEach((stop,index)=>{
    const card=element('article','stop');card.append(element('time','',`建議 ${clock(cursor)}`),element('h3','',stop.name),element('p','',`${stop.category} · 建議停留約 ${stop.minutes} 分 · ${stop.note}`));
    const link=element('a','map-link','地圖與來源 ↗');link.href=stop.source||mapUrl(stop);link.target='_blank';link.rel='noopener noreferrer';card.append(link);
    if(stop.rainReplacement)card.append(element('p','hint','雨天替換：附近未排入的室內地點'));
    box.append(card);
    const leg=day.legs[index];if(!leg)return;
    const next=day.stops[index+1],section=element('section','leg');section.append(element('h4','',`前往 ${next.name} · 直線約 ${km(stop,next).toFixed(1)} km`));
    section.append(element('p','hint','候選交通是距離模型，是否有班次／道路及實際票價須查證。'));
    const list=element('div','route-list');let selected=routeChoices[activeDay][index]??0;if(selected>=leg.options.length)selected=0;
    leg.options.forEach((route,optionIndex)=>{
      const label=element('label',`route-option${selected===optionIndex?' selected':''}`),radio=element('input');radio.type='radio';radio.name=`route-${activeDay}-${index}`;radio.checked=selected===optionIndex;
      radio.onchange=()=>{routeChoices[activeDay][index]=optionIndex;renderTrip();save();};
      const body=element('span','route-body');body.append(element('strong','',`${route.mode} · 約 ${route.duration_min} 分`),element('small','',`Money 待查 · Time 約 ${route.duration_min} 分`),element('small','',`Energy ${route.energy_score}/100 · Friction ${route.friction_score}/100 · 步行約 ${route.walking_min} 分`));
      label.append(radio,body);list.append(label);
    });
    section.append(list);const routeLink=element('a','map-link','查詢實際路線 ↗');routeLink.href=directionsUrl(stop,next);routeLink.target='_blank';routeLink.rel='noopener noreferrer';section.append(routeLink);box.append(section);
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
    city=saved.city;catalog=saved.catalog;trip=saved.trip;activeDay=Math.min(Math.max(0,saved.activeDay||0),trip.days-1);adjustments=Array.isArray(saved.adjustments)?saved.adjustments:Array.from({length:trip.days},()=>({}));routeChoices=Array.isArray(saved.routeChoices)?saved.routeChoices:Array.from({length:trip.days},()=>[]);
    for(const word of saved.words||[])if(Object.hasOwn(adjectives,word))words.add(word);
    for(const chip of $('chips').children)chip.setAttribute('aria-pressed',String(words.has(chip.textContent)));
    $('destination').value=city.name;$('chosenCity').textContent=cityLabel(city);$('placeStage').classList.remove('hidden');
    for(const id of trip.placeIds)selectedIds.add(id);renderPlaces();
    for(const id of ['date','days','travelers','budget','currency'])$(id).value=trip[id];
    renderDNA();renderSummary();renderTrip();show('result');
  }
}catch{}
