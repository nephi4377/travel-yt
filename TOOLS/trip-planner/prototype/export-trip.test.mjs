import test from 'node:test';
import assert from 'node:assert/strict';
import {formatTripText} from './export-trip.js';

test('exports every day, chosen route, sourced places and honest cost warning',()=>{
  const trip={city:{name:'Paris'},date:'2026-10-01',days:2,travelers:2,budget:1000,currency:'EUR',preferenceWords:['nature'],startTime:'10:00',dayStartTimes:['09:00','11:30']};
  const a={name:'Museum',category:'culture',minutes:60,lat:48.86,lng:2.33,source:'https://www.openstreetmap.org/way/1'};
  const b={name:'Park',category:'nature',minutes:50,lat:48.87,lng:2.34,source:'https://www.openstreetmap.org/way/2'};
  const option=(mode,travelMode,duration_min)=>({mode,travelMode,duration_min,energy_score:12,friction_score:20});
  const days=[{stops:[a,b],legs:[{options:[option('walk','walking',25),option('transit','transit',15)]}]},{stops:[b],legs:[]}];
  const result=formatTripText(trip,days,[[1],[]]);
  assert.match(result,/第 1 天｜2026-10-01｜09:00 出發/);
  assert.match(result,/第 2 天｜2026-10-02｜11:30 出發/);
  assert.match(result,/transit；Time 約 15 分/);
  assert.doesNotMatch(result,/walk；Time 約 25 分/);
  assert.match(result,/https:\/\/www.openstreetmap.org\/way\/1/);
  assert.match(result,/travelmode=transit/);
  assert.match(result,/Money 待查/);
  assert.match(result,/尚未核算/);
});
