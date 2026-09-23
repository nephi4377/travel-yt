import {isValidCalendarDate} from './draft.js';

const nonEmpty=value=>typeof value==='string'&&value.trim().length>0;
const wholeNonNegative=value=>Number.isInteger(value)&&value>=0;
const score=value=>Number.isInteger(value)&&value>=0&&value<=100;

// Shape accepted at a future Places/Routes boundary. Mock itinerary templates stay separate.
export function assertProviderDay(day){
  if(!day||!isValidCalendarDate(day.date)||!Array.isArray(day.stops)||day.stops.length<2)throw new TypeError('Invalid dated day');
  const ids=new Set();
  for(const stop of day.stops){
    if(!nonEmpty(stop?.id)||ids.has(stop.id)||!nonEmpty(stop.name)||!nonEmpty(stop.time))throw new TypeError('Invalid place identity');
    const {lat,lng}=stop.coordinates||{};
    if(!Number.isFinite(lat)||lat < -90||lat > 90||!Number.isFinite(lng)||lng < -180||lng > 180)throw new TypeError('Invalid place coordinates');
    ids.add(stop.id);
  }
  if(!Array.isArray(day.legs)||day.legs.length!==day.stops.length-1)throw new TypeError('Route count does not match places');
  day.legs.forEach((leg,index)=>{
    if(leg?.from!==day.stops[index].id||leg?.to!==day.stops[index+1].id||!Array.isArray(leg.options)||leg.options.length<1||leg.options.length>3)throw new TypeError('Invalid route endpoints or options');
    for(const route of leg.options){
      if(!nonEmpty(route?.mode)||!wholeNonNegative(route.duration_min)||!wholeNonNegative(route.walking_min)||!wholeNonNegative(route.transfers)||!Number.isFinite(route.estimated_cost)||route.estimated_cost<0||!/^[A-Z]{3}$/.test(route.currency||'')||!score(route.energy_score)||!score(route.friction_score))throw new TypeError('Invalid route cost dimensions');
    }
  });
  return day;
}
