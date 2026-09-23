import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assertProviderDay} from './provider-contract.js';

const example=()=>({date:'2026-09-23',stops:[
  {id:'a',name:'Start',time:'10:00',coordinates:{lat:35.115,lng:129.041}},
  {id:'b',name:'Finish',time:'11:00',coordinates:{lat:35.12,lng:129.05}}
],legs:[{from:'a',to:'b',options:[{mode:'bus',duration_min:20,walking_min:5,transfers:0,estimated_cost:1500,currency:'KRW',energy_score:15,friction_score:25}]}]});

test('provider contract accepts a dated, connected and priced day',()=>{
  const day=example();assert.equal(assertProviderDay(day),day);
});
test('provider contract rejects coordinates and disconnected routes',()=>{
  const outside=example();outside.stops[1].coordinates.lng=200;
  assert.throws(()=>assertProviderDay(outside),/coordinates/);
  const disconnected=example();disconnected.legs[0].to='other';
  assert.throws(()=>assertProviderDay(disconnected),/endpoints/);
});
