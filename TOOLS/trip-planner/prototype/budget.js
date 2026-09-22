export function groupRouteCost(route,travelers){return route.estimated_cost*(route.mode==='計程車'?1:travelers);}
export function summarizeDayTransport(day,travelers,budget){const total=day.legs.reduce((sum,leg)=>sum+groupRouteCost(leg.options[0],travelers),0);return {total,budget,difference:budget-total,withinBudget:total<=budget};}
