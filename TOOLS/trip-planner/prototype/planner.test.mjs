import assert from 'node:assert/strict';
import {test} from 'node:test';
import {tripDNA} from './engine.js';
import {buildDemoDay,maxDemoDays,selectedTransportTotal} from './planner.js';

test('all advertised demo days have aligned stops and route choices',()=>{
  const input={travelers:2};const dna=tripDNA(['舒服']);
  assert.equal(maxDemoDays,6);
  for(let index=0;index<maxDemoDays;index++){
    const day=buildDemoDay(index,input,dna);
    assert.equal(day.legs.length,day.stops.length-1);
    assert.ok(day.legs.every(leg=>leg.options.length>=1&&leg.options.length<=3));
    assert.ok(selectedTransportTotal(day,2)>=0);
  }
});
test('selected route changes total and adjustments stay valid',()=>{
  const input={travelers:5};const dna=tripDNA(['少走路']);
  const day=buildDemoDay(1,input,dna);
  assert.notEqual(selectedTransportTotal(day,5,{0:0}),selectedTransportTotal(day,5,{0:1}));
  const revised=buildDemoDay(2,input,dna,{tired:true,rain:true,noMetro:true});
  assert.equal(revised.legs.length,revised.stops.length-1);
  assert.ok(revised.legs.every(leg=>leg.options.every(route=>route.mode!=='地鐵'&&route.walking_min<=9)));
  assert.ok(revised.stops.some(stop=>stop.name.includes('室內')));
});
test('other destinations never show named Busan places',()=>{
  const day=buildDemoDay(0,{destination:'河內',travelers:2},tripDNA([]));
  assert.ok(day.stops.every(stop=>stop.name.includes('示範')));
  assert.ok(day.stops.every(stop=>!stop.name.includes('釜山')));
});
