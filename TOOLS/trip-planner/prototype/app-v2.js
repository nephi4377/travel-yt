import {dimensions,adjectives,tripDNA,parseAdjustment} from './engine.js';
import {groupRouteCost} from './budget.js';
import {buildDemoDay,maxDemoDays,selectedTransportTotal,selectedTripTransportTotal,recommendRoutesForBudget} from './planner.js';
import {draftKey,normalizeDraft} from './draft.js';
import {describeRouteTradeoff} from './reasons.js';

const $=id=>document.getElementById(id);
const selectedWords=new Set();
let trip=null;
let activeDay=0;
let adjustments=[];
let routeChoices=[];
let expandedRoutes=[];
function saveDraft(){if(!trip)return;try{sessionStorage.setItem(draftKey,JSON.stringify({trip,words:[...selectedWords],activeDay,adjustments,routeChoices}));}catch{}}
const make=(tag,className='',label)=>{const node=document.createElement(tag);node.className=className;if(label!==undefined)node.textContent=label;return node;};

for(const word of Object.keys(adjectives)){
  const button=make('button','chip',word);button.type='button';button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>{if(selectedWords.has(word))selectedWords.delete(word);else selectedWords.add(word);button.setAttribute('aria-pressed',String(selectedWords.has(word)));renderDNA();});
  $('chips').append(button);
}
function renderDNA(){
  const box=$('dnaBars');box.replaceChildren();
  for(const [key,label] of Object.entries(dimensions)){
    const score=tripDNA(selectedWords).weights[key];
    const row=make('div','barrow'),track=make('div','track'),fill=make('div','fill');fill.style.width=`${score}%`;
    track.append(fill);row.append(make('span','',label),track,make('strong','',String(score)));box.append(row);
  }
}
function show(section){
  for(const id of ['feel','conditions','result'])$(id).classList.toggle('hidden',id!==section);
  ['feel','conditions','result'].forEach((id,i)=>$(`step${i+1}`).classList.toggle('active',id===section));
  window.scrollTo({top:0,behavior:'instant'});
}
$('next').addEventListener('click',()=>show('conditions'));
$('back').addEventListener('click',()=>show('feel'));
$('restart').addEventListener('click',()=>{trip=null;try{sessionStorage.removeItem(draftKey);}catch{}show('feel');});
const nextDate=new Date(Date.now()+86400000);$('date').value=`${nextDate.getFullYear()}-${String(nextDate.getMonth()+1).padStart(2,'0')}-${String(nextDate.getDate()).padStart(2,'0')}`;
function dayDate(index){const date=new Date(`${trip.date}T12:00:00`);date.setDate(date.getDate()+index);return `${date.getMonth()+1}/${date.getDate()}`;}

$('tripForm').addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.currentTarget;if(!form.reportValidity())return;
  trip={destination:$('destination').value.trim(),date:$('date').value,days:Number($('days').value),travelers:Number($('travelers').value),budget:Number($('budget').value)};
  if(!trip.destination||trip.days<1||trip.days>maxDemoDays)return;
  activeDay=0;adjustments=Array.from({length:trip.days},()=>({}));
  routeChoices=Array.from({length:trip.days},(_,index)=>recommendRoutesForBudget(buildDemoDay(index,trip,tripDNA(selectedWords)),trip.travelers,tripDNA(selectedWords),trip.budget).choices);
  expandedRoutes=Array.from({length:trip.days},()=>({}));
  $('resultTitle').textContent=`${trip.destination} · ${trip.date} 起 ${trip.days} 天`;
  $('summary').textContent=`${trip.travelers} 人 · 每日交通上限 ${trip.budget.toLocaleString()} KRW／團 · 偏好：${[...selectedWords].join('、')||'預設均衡'}。${/^(釜山|busan)$/i.test(trip.destination)?'釜山 mock 行程。':'此目的地只顯示通用 mock 站點，並非真實行程。'}`;
  renderTabs();renderDay();saveDraft();show('result');
});

function renderTabs(){
  const tabs=$('dayTabs');tabs.replaceChildren();
  for(let i=0;i<trip.days;i++){
    const button=make('button','day-tab',`第 ${i+1} 天 · ${dayDate(i)}`);button.type='button';button.setAttribute('aria-pressed',String(i===activeDay));
    button.addEventListener('click',()=>{activeDay=i;$('preview').replaceChildren();renderTabs();renderDay();saveDraft();});tabs.append(button);
  }
}
function costBadges(route){
  const badges=make('span','costs');
  for(const label of [`Money ${groupRouteCost(route,trip.travelers).toLocaleString()} KRW／團`,`Time ${route.duration_min} 分`,`Energy ${route.energy_score}/100`,`Friction ${route.friction_score}/100`])badges.append(make('span','',label));
  return badges;
}
function renderDay(){
  const day=buildDemoDay(activeDay,trip,tripDNA(selectedWords),adjustments[activeDay]);
  const choices=routeChoices[activeDay],box=$('schedule');box.replaceChildren();
  for(const [index,leg] of day.legs.entries())if((choices[index]??0)>=leg.options.length)choices[index]=0;
  const heading=make('div','day-heading');heading.append(make('span','eyebrow',`DAY ${activeDay+1} · ${dayDate(activeDay)}`),make('h3','',day.title));box.append(heading);
  const total=selectedTransportTotal(day,trip.travelers,choices),difference=trip.budget-total;
  const allDays=Array.from({length:trip.days},(_,index)=>buildDemoDay(index,trip,tripDNA(selectedWords),adjustments[index]));
  const tripTotal=selectedTripTransportTotal(allDays,trip.travelers,routeChoices),tripLimit=trip.budget*trip.days;
  const budget=make('div',`budget-card${difference<0?' over-budget':''}`);budget.append(make('strong','',`當天交通合計：${total.toLocaleString()} KRW／團`),make('p','',difference>=0?`目前選擇比每日上限少 ${difference.toLocaleString()} KRW；可自行換選交通。`:`目前選擇超過每日上限 ${(-difference).toLocaleString()} KRW；可試選其他方案。`),make('p','',`全程交通估計：${tripTotal.toLocaleString()}／${tripLimit.toLocaleString()} KRW（${trip.days} 天上限）`));
  if(allDays.some(item=>item.legs.some(leg=>leg.estimateNeedsRecheck)))budget.append(make('p','',`全程估計包含雨天替代點附近尚未重算的交通費，請勿當作可用報價。`));
  box.append(budget);
  day.stops.forEach((stop,index)=>{
    const card=make('article','stop');card.append(make('time','',stop.time),make('h3','',stop.name),make('p','',`${stop.priority} · ${stop.note}`));box.append(card);
    if(index>=day.legs.length)return;
    const leg=day.legs[index],section=make('section','leg');section.append(make('h4','',`前往下一站 · 選擇交通`));
    if(leg.estimateNeedsRecheck)section.append(make('p','warning','此段通往雨天替代點；下方交通時間與費用沿用原站點示範值，尚未重新估算。'));
    const list=make('div','route-list');
    const selectedIndex=choices[index]??0;
    const expanded=!!expandedRoutes[activeDay][index];
    leg.options.forEach((route,routeIndex)=>{
      if(!expanded&&routeIndex!==selectedIndex)return;
      const label=make('label',`route-option${(choices[index]??0)===routeIndex?' selected':''}`);
      const input=make('input');input.type='radio';input.name=`day-${activeDay}-leg-${index}`;input.value=String(routeIndex);input.checked=(choices[index]??0)===routeIndex;
      input.addEventListener('change',()=>{choices[index]=routeIndex;renderDay();saveDraft();});
      const details=make('span','route-body');details.append(make('strong','',`${route.mode} · ${route.duration_min} 分鐘`),costBadges(route),make('small','',`步行 ${route.walking_min} 分 · 轉乘 ${route.transfers} 次`));
      if((choices[index]??0)===routeIndex)details.append(make('small','route-reason',`方案特色：${describeRouteTradeoff(route,leg.options,trip.travelers)}`));
      label.append(input,details);list.append(label);
    });
    section.append(list);
    if(leg.options.length>1){
      const toggle=make('button','route-toggle',expanded?'收合其他交通':`比較其他 ${leg.options.length-1} 種交通`);
      toggle.type='button';toggle.setAttribute('aria-expanded',String(expanded));
      toggle.addEventListener('click',()=>{expandedRoutes[activeDay][index]=!expanded;renderDay();});section.append(toggle);
    }
    box.append(section);
  });
}

$('adjustForm').addEventListener('submit',event=>{
  event.preventDefault();const change=parseAdjustment($('adjust').value),preview=$('preview');preview.replaceChildren();
  if(!Object.values(change).some(Boolean)){preview.append(make('p','error','此版尚無法理解這句話。請試「累了」、「下雨」或「不搭地鐵」。'));return;}
  const current=buildDemoDay(activeDay,trip,tripDNA(selectedWords),adjustments[activeDay]);
  const canDrop=current.stops.at(-1)?.priority==='可取消';
  const hasOutdoor=current.stops.some(stop=>stop.outdoor||stop.id==='market');
  const effects=[change.tired?`縮短步行${canDrop?'並移除最後一個可取消景點':''}`:null,change.rain?(hasOutdoor?'把一個戶外點換成室內示範點':'當天沒有可替換的戶外點'):null,change.noMetro?'移除地鐵選項':null].filter(Boolean);
  preview.append(make('p','preview',`第 ${activeDay+1} 天預覽：${effects.join('；')}。這是 mock 規則，不保證真實路線或營業狀態。`));
  const button=make('button','primary','套用到這一天');button.type='button';button.addEventListener('click',()=>{
    const before=buildDemoDay(activeDay,trip,tripDNA(selectedWords),adjustments[activeDay]);
    const selectedModes=before.legs.map((leg,index)=>leg.options[routeChoices[activeDay][index]??0]?.mode);
    adjustments[activeDay]={...adjustments[activeDay],...change};
    const after=buildDemoDay(activeDay,trip,tripDNA(selectedWords),adjustments[activeDay]);
    routeChoices[activeDay]=Object.fromEntries(after.legs.map((leg,index)=>[index,Math.max(0,leg.options.findIndex(route=>route.mode===selectedModes[index]))]));
    renderDay();saveDraft();preview.replaceChildren(make('p','preview',`已調整第 ${activeDay+1} 天；其他天不變。`));
  });preview.append(button);
});
renderDNA();
try{
  const restored=normalizeDraft(JSON.parse(sessionStorage.getItem(draftKey)),maxDemoDays);
  if(restored){
    trip=restored.trip;activeDay=restored.activeDay;adjustments=restored.adjustments;routeChoices=restored.routeChoices;expandedRoutes=Array.from({length:trip.days},()=>({}));
    for(const word of restored.words)if(Object.hasOwn(adjectives,word))selectedWords.add(word);
    for(const chip of $('chips').children)chip.setAttribute('aria-pressed',String(selectedWords.has(chip.textContent)));
    $('destination').value=trip.destination;$('date').value=trip.date;$('days').value=String(trip.days);$('travelers').value=String(trip.travelers);$('budget').value=String(trip.budget);
    $('resultTitle').textContent=`${trip.destination} · ${trip.date} 起 ${trip.days} 天`;
    $('summary').textContent=`${trip.travelers} 人 · 每日交通上限 ${trip.budget.toLocaleString()} KRW／團 · 偏好：${[...selectedWords].join('、')||'預設均衡'}。${/^(釜山|busan)$/i.test(trip.destination)?'釜山 mock 行程。':'此目的地只顯示通用 mock 站點，並非真實行程。'}`;
    renderDNA();renderTabs();renderDay();show('result');
  }
}catch{}
