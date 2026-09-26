import test from 'node:test';
import assert from 'node:assert/strict';
import {roadRouteUrl,normalizeRoadRoute,fetchRoadRoute} from './route-data.js';

const from={lat:48.8606,lng:2.3376},to={lat:48.8584,lng:2.2945};
test('road lookup sends one minimal, coordinate-ordered car request',async()=>{
  const url=roadRouteUrl(from,to);
  assert.equal(url.hostname,'routing.openstreetmap.de');
  assert.match(url.pathname,/2\.3376,48\.8606;2\.2945,48\.8584/);
  assert.equal(url.searchParams.get('overview'),'false');
  assert.throws(()=>roadRouteUrl({lat:999,lng:0},to),TypeError);
  const fetcher=async request=>{assert.equal(request,url.toString());return {ok:true,json:async()=>({code:'Ok',routes:[{distance:5420,duration:1120}]})};};
  assert.deepEqual(await fetchRoadRoute(from,to,fetcher),{distanceKm:5.4,minutes:19,source:'OSRM / OpenStreetMap',mode:'car'});
});
test('road lookup rejects missing or invalid routes rather than inventing values',async()=>{
  assert.equal(normalizeRoadRoute({code:'NoRoute',routes:[]}),null);
  assert.equal(normalizeRoadRoute({code:'Ok',routes:[{distance:-1,duration:20}]}),null);
  await assert.rejects(fetchRoadRoute(from,to,async()=>({ok:true,json:async()=>({code:'NoRoute'})})),/找不到/);
});
