export const draftKey='tripdna-v02-session-draft';
export function isValidCalendarDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const parsed=new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
export function normalizeDraft(value,maxDays){
  if(!value||typeof value!=='object')return null;
  const trip=value.trip;
  if(!trip||typeof trip.destination!=='string'||!trip.destination.trim()||trip.destination.length>100)return null;
  if(!isValidCalendarDate(trip.date))return null;
  if(!Number.isInteger(trip.days)||trip.days<1||trip.days>maxDays)return null;
  if(!Number.isInteger(trip.travelers)||trip.travelers<1||trip.travelers>12)return null;
  if(!Number.isFinite(trip.budget)||trip.budget<0)return null;
  const words=Array.isArray(value.words)?value.words.filter(word=>typeof word==='string'):[];
  const activeDay=Number.isInteger(value.activeDay)&&value.activeDay>=0&&value.activeDay<trip.days?value.activeDay:0;
  const adjustments=Array.from({length:trip.days},(_,index)=>{
    const item=Array.isArray(value.adjustments)?value.adjustments[index]:null;
    return {tired:item?.tired===true,rain:item?.rain===true,noMetro:item?.noMetro===true};
  });
  const routeChoices=Array.from({length:trip.days},(_,index)=>{
    const item=Array.isArray(value.routeChoices)?value.routeChoices[index]:null;
    return item&&typeof item==='object'?Object.fromEntries(Object.entries(item).filter(([key,choice])=>/^\d+$/.test(key)&&Number.isInteger(choice)&&choice>=0&&choice<3)):{};
  });
  return {trip:{destination:trip.destination.trim(),date:trip.date,days:trip.days,travelers:trip.travelers,budget:trip.budget},words,activeDay,adjustments,routeChoices};
}
