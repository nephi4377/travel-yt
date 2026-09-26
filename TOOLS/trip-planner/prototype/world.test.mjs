import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCities,normalizePlaces,overpassQuery,searchCities,searchPlaces} from './world-data.js';
import {buildWorldTrip,transportOptions,suggestedPlaceIds} from './world-planner.js';
import {tripDNA} from './engine.js';

const city={id:'1',name:'Example',lat:48.85,lng:2.35};
const items=Array.from({length:8},(_,i)=>({type:'node',id:i+1,lat:48.85+i*.002,lon:2.35+i*.002,tags:{name:`Place ${i+1}`,tourism:i%3===0?'museum':'attraction'}}));
test('city search is explicit, global and safely encoded',async()=>{
  let requested='';const fetcher=async url=>{requested=url;return {ok:true,json:async()=>({results:[{id:1,name:'Paris',latitude:48.85,longitude:2.35,country:'France'}]})};};
  const result=await searchCities('Paris, France',fetcher);assert.equal(result[0].country,'France');assert.match(requested,/name=Paris%2C\+France/);
  assert.equal(normalizeCities({results:[{name:'bad',latitude:999,longitude:0}]}).length,0);
});
test('Overpass query is bounded and place results retain source IDs',async()=>{
  assert.match(overpassQuery(city,100000),/around:7000/);assert.match(overpassQuery(city),/out center 35/);assert.match(overpassQuery(city),/out center 30/);
  const fetcher=async url=>{assert.match(url,/overpass-api\.de/);return {ok:true,json:async()=>({elements:items})};};
  const places=await searchPlaces(city,fetcher);assert.equal(places.length,8);assert.equal(places[0].source,'https://www.openstreetmap.org/node/1');
  assert.equal(normalizePlaces({elements:[{type:'node',id:9,lat:0,lon:0,tags:{}}]},city).length,0);
});
test('documented major places rank above incidental nearby attractions',()=>{
  const ranked=normalizePlaces({elements:[
    {type:'node',id:1,lat:city.lat,lon:city.lng,tags:{name:'Small display',tourism:'attraction'}},
    {type:'node',id:2,lat:city.lat+.01,lon:city.lng+.01,tags:{name:'National Museum',tourism:'museum',wikidata:'Q123'}}
  ]},city);
  assert.equal(ranked[0].name,'National Museum');
  assert.equal(ranked[0].kind,'indoor');
  assert.equal(ranked[1].kind,'unknown');
});
test('world trip uses only returned places and never invents fares',()=>{
  const catalog=normalizePlaces({elements:items},city),dna=tripDNA(['舒服']);
  const input={city,catalog,placeIds:catalog.slice(0,6).map(p=>p.id),days:3};
  const days=buildWorldTrip(input,dna);
  assert.equal(days.length,3);assert.equal(new Set(days.flatMap(d=>d.stops.map(p=>p.id))).size,6);
  assert.ok(days.every(d=>d.legs.length===d.stops.length-1&&d.legs.every(leg=>leg.options.every(o=>o.estimated_cost===null&&o.options===undefined))));
  assert.ok(transportOptions(catalog[0],catalog[1],dna).length<=3);
  assert.throws(()=>buildWorldTrip({...input,placeIds:[]},dna),RangeError);
});
test('suggested places include several categories when available',()=>{
  const ids=suggestedPlaceIds([{id:'m1',category:'室內文化'},{id:'m2',category:'室內文化'},{id:'p',category:'公園'},{id:'h',category:'歷史地點'}],[],3);
  assert.deepEqual(ids,['m1','p','h']);
});
test('rain swaps with a nearby unselected indoor place, tired removes a stop',()=>{
  const catalog=normalizePlaces({elements:items},city).map((p,i)=>({...p,kind:i<4?'outdoor':i===4?'indoor':p.kind})),dna=tripDNA([]),selected=catalog.slice(0,4);
  const input={city,catalog,placeIds:selected.map(p=>p.id),days:2};
  const normal=buildWorldTrip(input,dna),adjusted=buildWorldTrip(input,dna,[{rain:true,tired:true},{}]);
  assert.ok(adjusted[0].stops.length<normal[0].stops.length);
  assert.ok(adjusted[0].stops.every(p=>catalog.some(x=>x.id===p.id)));
});
