import test from 'node:test';
import assert from 'node:assert/strict';
import {nominatimUrl,createNominatimProxy} from './nominatim-proxy.mjs';
import {localNominatimUrl,namedPlaceUrl} from './world-data.js';

test('local prototype routes only Nominatim requests through its shared proxy',()=>{
  const upstream=namedPlaceUrl({lat:48.85,lng:2.35},'Louvre Museum');
  const local=new URL(localNominatimUrl(upstream,'http://localhost:8000'));
  assert.equal(local.pathname,'/api/nominatim/search');
  assert.equal(local.searchParams.get('q'),'Louvre Museum');
  assert.equal(new URL(localNominatimUrl(upstream,'http://localhost:8001')).pathname,'/api/nominatim/search');
  assert.equal(localNominatimUrl(upstream,'https://example.com'),null);
  assert.throws(()=>nominatimUrl('search',new URLSearchParams('q=Paris&format=jsonv2&limit=100')),/bounded/);
  assert.throws(()=>nominatimUrl('lookup',new URLSearchParams('osm_ids=N1,N2&format=jsonv2')),/one OSM object/);
  assert.throws(()=>nominatimUrl('search',new URLSearchParams('q=Paris&format=jsonv2&limit=8&evil=1')),/Unsupported/);
});

test('one proxy process caches, coalesces and spaces outbound requests',async()=>{
  let clock=1000;const pauses=[],calls=[];
  const proxy=createNominatimProxy({now:()=>clock,pause:async ms=>{pauses.push(ms);clock+=ms;},fetcher:async url=>{
    calls.push(url);return {ok:true,text:async()=>JSON.stringify([{osm_type:'node',osm_id:1}])};
  }});
  const paris=new URLSearchParams('q=Paris&format=jsonv2&limit=8');
  const kyoto=new URLSearchParams('q=Kyoto&format=jsonv2&limit=8');
  const [a,b]=await Promise.all([proxy('search',paris),proxy('search',paris)]);
  assert.deepEqual(a,b);assert.equal(calls.length,1);
  assert.deepEqual(await proxy('search',paris),a);assert.equal(calls.length,1);
  await proxy('search',kyoto);assert.equal(calls.length,2);assert.deepEqual(pauses,[1100]);
});
