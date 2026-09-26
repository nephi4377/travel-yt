import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCities,normalizePlaces,overpassQuery,searchCities,searchPlaces,namedPlaceUrl,normalizeNamedPlaces,searchNamedPlaces,mergePlaces} from './world-data.js';
import {buildWorldTrip,groupPlaceIds,sameTripSelection,transportOptions,suggestedPlaceIds,rankPlaces,recommendPlaces} from './world-planner.js';
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
test('named landmark lookup is explicit, bounded and uses real OSM IDs',async()=>{
  const url=namedPlaceUrl(city,'Tour Eiffel');
  assert.equal(url.hostname,'nominatim.openstreetmap.org');
  assert.equal(url.searchParams.get('bounded'),'1');
  assert.equal(url.searchParams.get('limit'),'8');
  assert.throws(()=>namedPlaceUrl(city,'a'),/3–80/);
  const payload=[{osm_type:'way',osm_id:501,lat:'48.858',lon:'2.294',category:'tourism',type:'attraction',display_name:'Tour Eiffel, Paris',importance:0.9},{osm_type:'way',osm_id:501,lat:'48.858',lon:'2.294',category:'tourism',type:'attraction',display_name:'duplicate'},{osm_type:'node',osm_id:9,lat:'48.85',lon:'2.35',category:'place',type:'city',display_name:'Paris'}];
  const fetcher=async request=>{assert.equal(new URL(request).searchParams.get('q'),'Tour Eiffel');return {ok:true,json:async()=>payload};};
  const places=await searchNamedPlaces(city,'Tour Eiffel',fetcher);
  assert.equal(places.length,1);
  assert.equal(places[0].id,'way-501');
  assert.equal(places[0].source,'https://www.openstreetmap.org/way/501');
  assert.deepEqual(normalizeNamedPlaces(payload,city),places);
  const misleading=[{osm_type:'node',osm_id:502,lat:'48.858',lon:'2.294',category:'amenity',type:'restaurant',display_name:'Le Jules Verne, Tour Eiffel, Paris'}];
  assert.deepEqual(normalizeNamedPlaces(misleading,city,'Tour Eiffel'),[]);
});
test('late nearby response keeps named places added while it was loading',()=>{
  const named={id:'way-1',name:'Chosen landmark'},nearby={id:'node-2',name:'Nearby park'};
  assert.deepEqual(mergePlaces([nearby],[named]),[nearby,named]);
  assert.deepEqual(mergePlaces([named,nearby],[named]),[named,nearby]);
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
test('manual day assignments preserve exact order and reject missing or repeated places',()=>{
  const catalog=normalizePlaces({elements:items},city),ids=catalog.slice(0,4).map(place=>place.id);
  const input={city,catalog,placeIds:ids,days:2,dayPlaceIds:[[ids[2],ids[0]],[ids[3],ids[1]]]};
  assert.deepEqual(groupPlaceIds(input).map(group=>group.map(place=>place.id)),input.dayPlaceIds);
  assert.deepEqual(buildWorldTrip(input,tripDNA([])).map(day=>day.stops.map(place=>place.id)),input.dayPlaceIds);
  assert.throws(()=>groupPlaceIds({...input,dayPlaceIds:[[ids[0],ids[0]],[ids[2],ids[3]]]}),RangeError);
  assert.throws(()=>groupPlaceIds({...input,dayPlaceIds:[[ids[0],ids[1],ids[2],ids[3]],[]]}),RangeError);
});
test('editing only trip conditions preserves the manual itinerary',()=>{
  const previous={city,days:2,placeIds:['a','b','c'],dayPlaceIds:[['b'],['a','c']]};
  assert.equal(sameTripSelection(previous,{...previous,date:'2026-10-10',travelers:3,placeIds:['c','b','a']}),true);
  assert.equal(sameTripSelection(previous,{...previous,days:3}),false);
  assert.equal(sameTripSelection(previous,{...previous,placeIds:['a','b','d']}),false);
  assert.equal(sameTripSelection(previous,{...previous,city:{...city,id:'other'}}),false);
});
test('suggested places include several categories when available',()=>{
  const ids=suggestedPlaceIds([{id:'m1',category:'室內文化'},{id:'m2',category:'室內文化'},{id:'p',category:'公園'},{id:'h',category:'歷史地點'}],[],3);
  assert.deepEqual(ids,['m1','p','h']);
});
test('supported TripDNA words change place ranking with an explicit reason',()=>{
  const places=[{id:'museum',name:'Museum',category:'室內文化',quality:0},{id:'park',name:'Park',category:'公園',quality:0},{id:'history',name:'History',category:'歷史地點',quality:0}];
  const nature=rankPlaces(places,['自然']),depth=rankPlaces(places,['深度']);
  assert.equal(nature[0].place.id,'park');
  assert.match(nature[0].reasons.join(' '),/自然/);
  assert.notEqual(depth[0].place.id,'park');
  assert.match(depth[0].reasons.join(' '),/深度/);
  assert.deepEqual(rankPlaces(places,['美食']).map(x=>x.score),[40,40,40]);
  assert.equal(recommendPlaces(places,['自然'],1)[0].place.id,'park');
  const fuller=[...places,{id:'park2',name:'Park 2',category:'公園',quality:0},{id:'park3',name:'Park 3',category:'公園',quality:0},{id:'museum2',name:'Museum 2',category:'室內文化',quality:0}];
  assert.notDeepEqual(suggestedPlaceIds(fuller,['自然'],3),suggestedPlaceIds(fuller,['深度'],3));
});
test('rain swaps with a nearby unselected indoor place, tired removes a stop',()=>{
  const catalog=normalizePlaces({elements:items},city).map((p,i)=>({...p,kind:i<4?'outdoor':i===4?'indoor':p.kind})),dna=tripDNA([]),selected=catalog.slice(0,4);
  const input={city,catalog,placeIds:selected.map(p=>p.id),days:2};
  const normal=buildWorldTrip(input,dna),adjusted=buildWorldTrip(input,dna,[{rain:true,tired:true},{}]);
  assert.ok(adjusted[0].stops.length<normal[0].stops.length);
  assert.ok(adjusted[0].stops.every(p=>catalog.some(x=>x.id===p.id)));
});
