import {places,placeById} from './catalog.js';
import {routeScore} from './engine.js';
import {groupRouteCost} from './budget.js';

const radians=value=>value*Math.PI/180;
export function distanceKm(a,b){const dLat=radians(b.lat-a.lat),dLng=radians(b.lng-a.lng);const h=Math.sin(dLat/2)**2+Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(dLng/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const round5=n=>Math.ceil(n/5)*5;
export function routeOptions(a,b,travelers,dna,adjustment={}){
  const km=distanceKm(a,b),walk=round5(km/4.2*60),bus=round5(10+km/18*60),taxi=round5(6+km/24*60);
  const option=(mode,duration_min,estimated_cost,walking_min,transfers,friction_score)=>({mode,duration_min,estimated_cost,currency:'KRW',walking_min,transfers,energy_score:clamp(Math.round(walking_min*2.2),0,100),friction_score,estimate:true});
  const list=[];
  if(km<=3.2&&!adjustment.tired)list.push(option('步行',Math.max(5,walk),0,Math.max(5,walk),0,4));
  list.push(option('公車',bus,1500,8,0,30));
  list.push(option('計程車',taxi,Math.ceil((4800+km*1400)/500)*500,3,0,14));
  return list.sort((x,y)=>routeScore(x,travelers,dna)-routeScore(y,travelers,dna)).slice(0,3);
}
export function recommendRouteChoices(day,travelers,dna,budget){
  let bestWithin=null,bestFallback=null;
  function visit(index,choices,cost,score){
    if(index===day.legs.length){
      const result={choices:[...choices],cost,score};
      if(cost<=budget&&(!bestWithin||score<bestWithin.score))bestWithin=result;
      if(!bestFallback||cost<bestFallback.cost||(cost===bestFallback.cost&&score<bestFallback.score))bestFallback=result;
      return;
    }
    day.legs[index].options.forEach((route,choice)=>{
      choices[index]=choice;
      visit(index+1,choices,cost+groupRouteCost(route,travelers),score+routeScore(route,travelers,dna));
    });
  }
  visit(0,[],0,0);
  return {...(bestWithin||bestFallback),withinBudget:!!bestWithin};
}
function nearestOrder(list){
  if(!list.length)return [];
  const remaining=[...list].sort((a,b)=>a.id.localeCompare(b.id));const result=[remaining.shift()];
  while(remaining.length){let best=0;for(let i=1;i<remaining.length;i++)if(distanceKm(result.at(-1),remaining[i])<distanceKm(result.at(-1),remaining[best]))best=i;result.push(remaining.splice(best,1)[0]);}
  return result;
}
export function allocateDays(ids,days,dna){
  const chosen=[...new Set(ids)].map(placeById).filter(Boolean);
  if(chosen.length<days)throw new RangeError('每一天至少需選一個地點');
  // Keep neighbourhoods together; split or merge only when day count requires it.
  const groups=[...new Set(chosen.map(p=>p.area))].map(area=>chosen.filter(p=>p.area===area));
  while(groups.length<days){const index=groups.reduce((best,g,i)=>g.length>groups[best].length?i:best,0);const group=nearestOrder(groups.splice(index,1)[0]);const cut=Math.ceil(group.length/2);groups.splice(index,0,group.slice(0,cut),group.slice(cut));}
  while(groups.length>days){const index=groups.reduce((best,g,i)=>g.length<groups[best].length?i:best,0);const group=groups.splice(index,1)[0];const nearest=groups.reduce((best,g,i)=>distanceKm(group[0],g[0])<distanceKm(group[0],groups[best][0])?i:best,0);groups[nearest].push(...group);}
  while(groups.some(g=>g.length>4)&&groups.some(g=>g.length<4)){
    const source=groups.findIndex(g=>g.length>4),targets=groups.map((g,i)=>({g,i})).filter(x=>x.g.length<4);
    const candidates=groups[source].flatMap((place,p)=>targets.map(target=>({p,target:target.i,km:distanceKm(place,target.g[0])}))).sort((a,b)=>a.km-b.km);
    const move=candidates[0];groups[move.target].push(groups[source].splice(move.p,1)[0]);
  }
  return groups.map(nearestOrder);
}
export function buildOfflineDay(index,input,dna,adjustment={}){
  const allocations=allocateDays(input.placeIds,input.days,dna);
  let chosen=[...allocations[index]];
  if(adjustment.rain){
    const reserved=new Set(allocations.flat().map(p=>p.id));
    chosen=chosen.map(place=>{
      if(place.kind!=='outdoor')return place;
      const candidate=places.filter(p=>p.kind==='indoor'&&!reserved.has(p.id)&&!chosen.some(s=>s.id===p.id)&&distanceKm(p,place)<=4).sort((a,b)=>distanceKm(a,place)-distanceKm(b,place))[0];
      if(candidate){reserved.add(candidate.id);return {...candidate,rainReplacement:true};}
      return place;
    });
  }
  if(adjustment.tired&&chosen.length>1)chosen.pop();
  const stops=chosen.map((p,i)=>({...p,time:`${String(10+Math.floor(i*2)).padStart(2,'0')}:00`,priority:'已選地點',outdoor:p.kind==='outdoor'}));
  const legs=stops.slice(1).map((stop,i)=>({from:stops[i].id,to:stop.id,options:routeOptions(stops[i],stop,input.travelers,dna,adjustment),estimateNeedsRecheck:true}));
  return {index,title:[...new Set(stops.map(p=>p.area))].join(' → '),stops,legs,estimate:true};
}
