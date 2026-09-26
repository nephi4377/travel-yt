import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultPlaceIds,places} from './catalog.js';
import {allocateDays,buildOfflineDay,distanceKm,routeOptions} from './offline-planner.js';
import {tripDNA} from './engine.js';
import {groupRouteCost} from './budget.js';

const dna=tripDNA(['舒服']);
const input={destination:'釜山',days:3,travelers:5,budget:40000,placeIds:defaultPlaceIds};
test('selected places become distinct days with connected routes',()=>{
  const days=allocateDays(input.placeIds,input.days,dna);
  assert.equal(days.length,3);
  assert.deepEqual(new Set(days.flat().map(p=>p.id)),new Set(input.placeIds));
  for(let i=0;i<3;i++){const day=buildOfflineDay(i,input,dna);assert.ok(day.stops.length);assert.equal(day.legs.length,day.stops.length-1);assert.ok(day.legs.every((leg,j)=>leg.from===day.stops[j].id&&leg.to===day.stops[j+1].id&&leg.options.length<=3));}
});
test('route estimate changes with geographic distance and taxi group size',()=>{
  const near=routeOptions(places[0],places[1],5,dna),far=routeOptions(places[0],places.at(-1),5,dna);
  assert.ok(distanceKm(places[0],places.at(-1))>distanceKm(places[0],places[1]));
  assert.ok(far.find(x=>x.mode==='計程車').estimated_cost>near.find(x=>x.mode==='計程車').estimated_cost);
  assert.equal(groupRouteCost(near.find(x=>x.mode==='計程車'),5),near.find(x=>x.mode==='計程車').estimated_cost*2);
});
test('rain uses a named unused indoor place and tired shortens active day',()=>{
  const before=buildOfflineDay(0,input,dna),rain=buildOfflineDay(0,input,dna,{rain:true}),tired=buildOfflineDay(0,input,dna,{tired:true});
  assert.ok(rain.stops.every(p=>places.some(x=>x.id===p.id)));
  assert.ok(tired.stops.length<before.stops.length);
  assert.ok(tired.legs.every(leg=>leg.options.every(route=>route.mode!=='步行')));
});
test('one selected place per day is valid and empty allocation is rejected',()=>{
  const one={...input,days:1,placeIds:['haeundae']};
  assert.equal(buildOfflineDay(0,one,dna).legs.length,0);
  assert.throws(()=>allocateDays([],1,dna),RangeError);
});
