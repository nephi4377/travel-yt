import {groupRouteCost} from './budget.js';

export function describeRouteTradeoff(route,options,travelers){
  if(!options.length)return '';
  const labels=[];
  const money=groupRouteCost(route,travelers);
  if(money===Math.min(...options.map(item=>groupRouteCost(item,travelers))))labels.push('全團費用最低');
  if(route.duration_min===Math.min(...options.map(item=>item.duration_min)))labels.push('移動時間最短');
  if(route.walking_min===Math.min(...options.map(item=>item.walking_min)))labels.push('步行最少');
  if(!labels.length)labels.push('費用、時間與體力的折衷');
  return labels.join(' · ');
}
