const rad=x=>x*Math.PI/180;
export function km(a,b){const dlat=rad(b.lat-a.lat),dlng=rad(b.lng-a.lng),h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
const round5=n=>Math.max(5,Math.ceil(n/5)*5);
export function transportOptions(from,to,dna,adjustment={}){
  const distance=km(from,to),walk=round5(distance/4*60),transit=round5(12+distance/18*60),car=round5(8+distance/25*60);
  const option=(mode,time,walking,friction)=>({mode,duration_min:time,walking_min:walking,energy_score:Math.min(100,Math.round(walking*2)),friction_score:friction,estimated_cost:null,currency:null,estimate:true});
  const options=[];
  if(distance<=3&&!adjustment.tired)options.push(option('步行',walk,walk,5));
  options.push(option('大眾運輸（待查）',transit,8,35),option('車輛（待查）',car,3,20));
  const weights=dna.weights;
  return options.sort((a,b)=>a.duration_min*(1+weights.pace/100)+a.energy_score*(1+(100-weights.walking_tolerance)/60)+a.friction_score*(1+(100-weights.transport_tolerance)/80)-b.duration_min*(1+weights.pace/100)-b.energy_score*(1+(100-weights.walking_tolerance)/60)-b.friction_score*(1+(100-weights.transport_tolerance)/80));
}
function nearestOrder(places,center){const remaining=[...places],ordered=[];let cursor=center;while(remaining.length){let best=0;for(let i=1;i<remaining.length;i++)if(km(cursor,remaining[i])<km(cursor,remaining[best]))best=i;cursor=remaining.splice(best,1)[0];ordered.push(cursor);}return ordered;}
// Only score preferences supported by the place categories we actually query.
// Other TripDNA dimensions must not be presented as verified place attributes.
export function rankPlaces(catalog,words=[]){
  return catalog.map((place,index)=>{
    const reasons=[],category=place.category;
    let score=40+Math.min(20,Math.max(0,Number(place.quality)||0)/8);
    if(words.includes('自然')&&(category==='公園'||category==='展望點')){score+=30;reasons.push('符合自然偏好：公園或觀景點');}
    if(words.includes('深度')&&(category==='歷史地點'||category==='室內文化')){score+=25;reasons.push('符合深度偏好：歷史或文化地點');}
    if((Number(place.quality)||0)>=60)reasons.push('地圖資料附有額外參考來源');
    if(!reasons.length)reasons.push('依地點類型與可查來源列入候選');
    return {place,score:Math.round(score),reasons,order:index};
  }).sort((a,b)=>b.score-a.score||a.order-b.order);
}
export function recommendPlaces(catalog,words=[],count=6){
  const remaining=rankPlaces(catalog,words),chosen=[],categoryCounts=new Map();
  const diversityPenalty=words.includes('自然')||words.includes('深度')?12:35;
  while(chosen.length<Math.max(0,count)&&remaining.length){
    let best=0;
    for(let i=1;i<remaining.length;i++){
      const candidate=remaining[i],current=remaining[best];
      const candidateScore=candidate.score-diversityPenalty*(categoryCounts.get(candidate.place.category)||0);
      const currentScore=current.score-diversityPenalty*(categoryCounts.get(current.place.category)||0);
      if(candidateScore>currentScore)best=i;
    }
    const [selection]=remaining.splice(best,1);chosen.push(selection);
    categoryCounts.set(selection.place.category,(categoryCounts.get(selection.place.category)||0)+1);
  }
  return chosen;
}
export function suggestedPlaceIds(catalog,words=[],count=6){return recommendPlaces(catalog,words,count).map(item=>item.place.id);}
export function sameTripSelection(previous,next){
  if(!previous||!next||previous.city?.id!==next.city?.id||previous.days!==next.days)return false;
  const a=previous.placeIds,b=next.placeIds;
  return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&new Set(a).size===a.length&&new Set(b).size===b.length&&a.every(id=>b.includes(id));
}
export function groupPlaceIds(input){
  const {catalog,placeIds,days,city}=input;
  if(!city||!Array.isArray(catalog)||!Number.isInteger(days)||days<1||days>6)throw new TypeError('Invalid trip');
  const selected=[...new Set(placeIds)].map(id=>catalog.find(p=>p.id===id)).filter(Boolean);
  if(selected.length<days||selected.length>days*4)throw new RangeError('每一天需有 1–4 個所選地點');
  if(input.dayPlaceIds){
    const groups=input.dayPlaceIds;
    if(!Array.isArray(groups)||groups.length!==days||groups.some(group=>!Array.isArray(group)||group.length<1||group.length>4))throw new RangeError('每天需有 1–4 個地點');
    const ids=groups.flat(),allowed=new Set(selected.map(place=>place.id));
    if(ids.length!==selected.length||new Set(ids).size!==ids.length||ids.some(id=>!allowed.has(id)))throw new RangeError('每日地點需與所選地點一致且不可重複');
    return groups.map(group=>group.map(id=>catalog.find(place=>place.id===id)));
  }
  const ordered=nearestOrder(selected,city),groups=Array.from({length:days},()=>[]);
  ordered.forEach((p,i)=>groups[Math.min(days-1,Math.floor(i*days/ordered.length))].push(p));
  return groups;
}
export function buildWorldTrip(input,dna,adjustments=[]){
  const {catalog,placeIds}=input;
  const groups=groupPlaceIds(input);
  const selected=placeIds.map(id=>catalog.find(place=>place.id===id)).filter(Boolean);
  const reserved=new Set(selected.map(p=>p.id));
  return groups.map((group,index)=>{
    const adjustment=adjustments[index]||{};
    let stops=group.map(place=>{
      if(!adjustment.rain||place.kind!=='outdoor')return place;
      const substitute=catalog.filter(p=>p.kind==='indoor'&&!reserved.has(p.id)&&km(p,place)<=4).sort((a,b)=>km(a,place)-km(b,place))[0];
      if(!substitute)return place;
      reserved.add(substitute.id);return {...substitute,rainReplacement:true};
    });
    if(adjustment.tired&&stops.length>1)stops=stops.slice(0,-1);
    const legs=stops.slice(1).map((stop,i)=>({from:stops[i].id,to:stop.id,options:transportOptions(stops[i],stop,dna,adjustment)}));
    return {stops,legs};
  });
}
export function mapUrl(place){return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(place.lat)}&mlon=${encodeURIComponent(place.lng)}#map=16/${encodeURIComponent(place.lat)}/${encodeURIComponent(place.lng)}`;}
export function directionsUrl(a,b){return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${a.lat},${a.lng}`)}&destination=${encodeURIComponent(`${b.lat},${b.lng}`)}`;}
