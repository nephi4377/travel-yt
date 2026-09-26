// Optional, explicit road-route evidence for one leg. Never equate this with
// a transit timetable, taxi quote, live traffic, or a booking.
export const ROAD_ROUTE_API='https://routing.openstreetmap.de/routed-car/route/v1/driving';

function validPoint(point){
  return Number.isFinite(point?.lat)&&point.lat>=-90&&point.lat<=90&&Number.isFinite(point?.lng)&&point.lng>=-180&&point.lng<=180;
}
export function roadRouteUrl(from,to){
  if(!validPoint(from)||!validPoint(to))throw new TypeError('Invalid route coordinates');
  const url=new URL(`${ROAD_ROUTE_API}/${from.lng},${from.lat};${to.lng},${to.lat}`);
  url.searchParams.set('overview','false');url.searchParams.set('steps','false');url.searchParams.set('generate_hints','false');
  return url;
}
export function normalizeRoadRoute(payload){
  const route=payload?.code==='Ok'?payload.routes?.[0]:null;
  if(!Number.isFinite(route?.distance)||route.distance<0||!Number.isFinite(route?.duration)||route.duration<0)return null;
  return {distanceKm:Math.round(route.distance/100)/10,minutes:Math.max(1,Math.round(route.duration/60)),source:'OSRM / OpenStreetMap',mode:'car'};
}
export async function fetchRoadRoute(from,to,fetcher=fetch){
  const response=await fetcher(roadRouteUrl(from,to).toString(),{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error(`道路查詢暫時無法使用（${response.status}）。`);
  const route=normalizeRoadRoute(await response.json());
  if(!route)throw new Error('目前找不到這兩個地點之間的開車路線。');
  return route;
}
