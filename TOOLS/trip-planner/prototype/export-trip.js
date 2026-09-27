import {startTimeMinutes, mapUrl, directionsUrl} from './world-planner.js';

const time=minutes=>`${minutes>=1440?'隔日 ':''}${String(Math.floor(minutes/60)%24).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
const dayDate=(date,index)=>{
  const value=new Date(`${date}T12:00:00`);
  if(Number.isNaN(value.getTime()))throw new TypeError('Invalid trip date');
  value.setDate(value.getDate()+index);
  return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
};

export function formatTripText(trip,days,routeChoices=[]){
  if(!trip||!Array.isArray(days)||days.length!==trip.days||!trip.city?.name)throw new TypeError('Invalid trip');
  const lines=[
    `${trip.city.name}｜${trip.date} 起 ${trip.days} 天`,
    `人數：${trip.travelers}；旅行偏好：${trip.preferenceWords?.join('、')||'未設定'}`,
    `預算：${trip.budget?`${trip.budget} ${trip.currency}（尚未核算）`:'未設定'}`,
    '資料來源：OpenStreetMap。以下時間與交通成本為估算；營業、班次、票價及路線請出發前核對。Money 待查。',
  ];
  days.forEach((day,dayIndex)=>{
    let cursor=startTimeMinutes(trip.dayStartTimes?.[dayIndex]||trip.startTime);
    lines.push('',`第 ${dayIndex+1} 天｜${dayDate(trip.date,dayIndex)}｜${time(cursor)} 出發`);
    day.stops.forEach((stop,index)=>{
      lines.push(`${index+1}. ${time(cursor)} ${stop.name}（${stop.category}，約 ${stop.minutes} 分）`);
      if(stop.note)lines.push(`   ${stop.note}`);
      lines.push(`   地點來源：${stop.source||mapUrl(stop)}`);
      const leg=day.legs[index];
      if(!leg)return;
      const chosen=routeChoices[dayIndex]?.[index]??0;
      const route=leg.options[chosen]||leg.options[0];
      if(!route)return;
      lines.push(`   → ${day.stops[index+1].name}：${route.mode}；Time 約 ${route.duration_min} 分；Energy ${route.energy_score}/100；Friction ${route.friction_score}/100；Money 待查`);
      lines.push(`   路線核對：${directionsUrl(stop,day.stops[index+1],route.travelMode)}`);
      cursor+=stop.minutes+30+route.duration_min;
    });
    lines.push(`預估最後一站約 ${time(cursor+(day.stops.at(-1)?.minutes||0))} 結束（未核對營業與等候時間）`);
  });
  return `${lines.join('\n')}\n`;
}
