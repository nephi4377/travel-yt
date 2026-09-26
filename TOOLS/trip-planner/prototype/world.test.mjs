import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCities,normalizeFallbackCities,fallbackCityUrl,searchFallbackCities,normalizePlaces,overpassQuery,searchCities,searchPlaces,namedPlaceUrl,normalizeNamedPlaces,searchNamedPlaces,parseOsmPlaceUrl,osmLookupUrl,lookupOsmPlace,mergePlaces} from './world-data.js';
import {buildWorldTrip,groupPlaceIds,sameTripSelection,transportOptions,directionsUrl,suggestedPlaceIds,rankPlaces,recommendPlaces} from './world-planner.js';
import {tripDNA} from './engine.js';

const city={id:'1',name:'Example',lat:48.85,lng:2.35};
const items=Array.from({length:8},(_,i)=>({type:'node',id:i+1,lat:48.85+i*.002,lon:2.35+i*.002,tags:{name:`Place ${i+1}`,tourism:i%3===0?'museum':'attraction'}}));
test('every estimated transport choice opens matching external route mode',()=>{
  const from={lat:48.85,lng:2.35},to={lat:48.86,lng:2.36};
  const options=transportOptions(from,to,tripDNA([]));
  assert.deepEqual(new Set(options.map(option=>option.travelMode)),new Set(['walking','transit','driving']));
  for(const option of options){
    const url=new URL(directionsUrl(from,to,option.travelMode));
    assert.equal(url.searchParams.get('api'),'1');
    assert.equal(url.searchParams.get('origin'),'48.85,2.35');
    assert.equal(url.searchParams.get('destination'),'48.86,2.36');
    assert.equal(url.searchParams.get('travelmode'),option.travelMode);
  }
});
test('city search is explicit, global and safely encoded',async()=>{
  let requested='';const fetcher=async url=>{requested=url;return {ok:true,json:async()=>({results:[{id:1,name:'Paris',latitude:48.85,longitude:2.35,country:'France'}]})};};
  const result=await searchCities('Paris, France',fetcher);assert.equal(result[0].country,'France');assert.match(requested,/name=Paris%2C\+France/);
  assert.equal(normalizeCities({results:[{name:'bad',latitude:999,longitude:0}]}).length,0);
});
test('alternate city lookup is explicit and returns only coordinate-bearing city candidates',async()=>{
  const url=fallbackCityUrl('Kyoto, Japan');
  assert.equal(url.searchParams.get('featureType'),'city');
  assert.equal(url.searchParams.get('q'),'Kyoto, Japan');
  const payload=[{osm_type:'relation',osm_id:42,name:'Kyoto',lat:'35.02',lon:'135.75',address:{state:'Kyoto Prefecture',country:'Japan'}},{osm_type:'relation',osm_id:42,name:'Kyoto',lat:'35.02',lon:'135.75'},{osm_type:'node',osm_id:43,name:'invalid',lat:'999',lon:'0'}];
  const fetcher=async request=>{assert.equal(new URL(request).searchParams.get('q'),'Kyoto, Japan');return {ok:true,json:async()=>payload};};
  assert.deepEqual(await searchFallbackCities('Kyoto, Japan',fetcher),[{id:'osm-relation-42',name:'Kyoto',region:'Kyoto Prefecture',country:'Japan',lat:35.02,lng:135.75,timezone:''}]);
  assert.equal(normalizeFallbackCities({}).length,0);
});
test('alternate city lookup removes indistinguishable nearby OSM duplicates but keeps distant cities',()=>{
  const result=normalizeFallbackCities([
    {osm_type:'node',osm_id:1,name:'Paris',lat:'48.8566',lon:'2.3522',address:{state:'Ile-de-France',country:'France'}},
    {osm_type:'relation',osm_id:2,name:'Paris',lat:'48.858',lon:'2.35',address:{state:'Ile-de-France',country:'France'}},
    {osm_type:'node',osm_id:3,name:'Paris',lat:'33.66',lon:'-95.55',address:{state:'Texas',country:'United States'}}
  ]);
  assert.deepEqual(result.map(item=>item.id),['osm-node-1','osm-node-3']);
  assert.deepEqual(normalizeFallbackCities([{osm_type:'relation',osm_id:4,name:'巴黎',lat:'48.85',lon:'2.35',address:{state:'法兰西岛大区;法蘭西島大區',country:'法国;法國'}}]).map(item=>[item.region,item.country]),[['法蘭西島大區','法國']]);
});
test('Overpass query is bounded and place results retain source IDs',async()=>{
  assert.match(overpassQuery(city,100000),/around:7000/);assert.match(overpassQuery(city),/out center 35/);assert.match(overpassQuery(city),/out center 30/);
  assert.match(overpassQuery(city),/amenity.*restaurant\|cafe\|food_court\|marketplace/);
  assert.match(overpassQuery(city),/shop.*mall\|department_store/);
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
test('user-requested wider named search stays local and excludes distant matches',async()=>{
  assert.equal(namedPlaceUrl(city,'Tour Eiffel','wider').searchParams.get('bounded'),'0');
  const payload=[
    {osm_type:'way',osm_id:11,lat:'48.858',lon:'2.294',category:'tourism',type:'attraction',display_name:'Tour Eiffel, Paris'},
    {osm_type:'way',osm_id:12,lat:'43.0',lon:'5.0',category:'tourism',type:'attraction',display_name:'Tour Eiffel, elsewhere'}
  ];
  const fetcher=async request=>{assert.equal(new URL(request).searchParams.get('bounded'),'0');return {ok:true,json:async()=>payload};};
  const places=await searchNamedPlaces(city,'Tour Eiffel',fetcher,'wider');
  assert.deepEqual(places.map(place=>place.id),['way-11']);
});
test('an official OSM object link can resolve one local named place',async()=>{
  const link='https://www.openstreetmap.org/way/5013364';
  assert.deepEqual(parseOsmPlaceUrl(link),{type:'way',id:5013364});
  assert.equal(osmLookupUrl(link).searchParams.get('osm_ids'),'W5013364');
  for(const invalid of ['https://evil.example/way/5013364','http://www.openstreetmap.org/way/5013364','https://www.openstreetmap.org/#map=16/48/2','https://www.openstreetmap.org/way/0'])assert.throws(()=>parseOsmPlaceUrl(invalid));
  const payload=[{osm_type:'way',osm_id:5013364,lat:'48.858',lon:'2.294',category:'tourism',type:'attraction',display_name:'Tour Eiffel, Paris'}];
  const fetcher=async request=>{assert.equal(new URL(request).searchParams.get('osm_ids'),'W5013364');return {ok:true,json:async()=>payload};};
  assert.equal((await lookupOsmPlace(city,link,fetcher)).id,'way-5013364');
  await assert.rejects(lookupOsmPlace({...city,lat:35,lng:135},link,fetcher),/120/);
  await assert.rejects(lookupOsmPlace(city,'https://www.openstreetmap.org/node/999',async request=>{assert.equal(new URL(request).searchParams.get('osm_ids'),'N999');return {ok:true,json:async()=>[]};}),/找不到/);
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
test('food, shopping and family interests use sourced place types, not invented reviews',()=>{
  const mapped=normalizePlaces({elements:[
    {type:'node',id:101,lat:city.lat,lon:city.lng,tags:{name:'Local cafe',amenity:'cafe'}},
    {type:'way',id:102,center:{lat:city.lat+.002,lon:city.lng},tags:{name:'Market hall',amenity:'marketplace'}},
    {type:'node',id:103,lat:city.lat+.004,lon:city.lng,tags:{name:'City zoo',tourism:'zoo'}},
    {type:'node',id:104,lat:city.lat+.006,lon:city.lng,tags:{name:'Museum',tourism:'museum'}}
  ]},city);
  assert.deepEqual(mapped.slice(0,3).map(place=>place.category),['室內文化','餐飲','購物']);
  assert.equal(rankPlaces(mapped,['美食'])[0].place.category,'餐飲');
  assert.match(rankPlaces(mapped,['美食'])[0].reasons.join(' '),/營業時間仍須核對/);
  assert.equal(rankPlaces(mapped,['購物'])[0].place.category,'購物');
  assert.equal(rankPlaces(mapped,['親子'])[0].place.category,'動物園');
  const named=normalizeNamedPlaces([{osm_type:'node',osm_id:201,lat:String(city.lat),lon:String(city.lng),category:'tourism',type:'theme_park',display_name:'Example theme park'}],city,'Example theme park');
  assert.equal(named[0].category,'主題樂園');
});
test('nearby shortlist retains food and shopping when highly documented sights dominate',()=>{
  const museums=Array.from({length:70},(_,i)=>({type:'node',id:i+1,lat:city.lat+i*.0001,lon:city.lng,tags:{name:`Museum ${i}`,tourism:'museum',wikidata:`Q${i}`}}));
  const extras=[{type:'node',id:1001,lat:city.lat,lon:city.lng,tags:{name:'Neighbourhood cafe',amenity:'cafe'}},{type:'node',id:1002,lat:city.lat,lon:city.lng,tags:{name:'City mall',shop:'mall'}}];
  const result=normalizePlaces({elements:[...museums,...extras]},city);
  assert.equal(result.length,60);
  assert.ok(result.some(place=>place.category==='餐飲'));
  assert.ok(result.some(place=>place.category==='購物'));
  assert.equal(rankPlaces(result,['美食'])[0].place.category,'餐飲');
});
test('rain swaps with a nearby unselected indoor place, tired removes a stop',()=>{
  const catalog=normalizePlaces({elements:items},city).map((p,i)=>({...p,kind:i<4?'outdoor':i===4?'indoor':p.kind})),dna=tripDNA([]),selected=catalog.slice(0,4);
  const input={city,catalog,placeIds:selected.map(p=>p.id),days:2};
  const normal=buildWorldTrip(input,dna),adjusted=buildWorldTrip(input,dna,[{rain:true,tired:true},{}]);
  assert.ok(adjusted[0].stops.length<normal[0].stops.length);
  assert.ok(adjusted[0].stops.every(p=>catalog.some(x=>x.id===p.id)));
});
