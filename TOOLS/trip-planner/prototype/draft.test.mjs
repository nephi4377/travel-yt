import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeDraft} from './draft.js';

test('valid session draft restores bounded trip data',()=>{
  const restored=normalizeDraft({trip:{destination:'釜山',date:'2026-09-23',days:2,travelers:5,budget:40000},words:['舒服'],activeDay:1,adjustments:[{}, {rain:true}],routeChoices:[{'0':2},{'0':99}]},6);
  assert.equal(restored.activeDay,1);
  assert.equal(restored.adjustments[1].rain,true);
  assert.deepEqual(restored.routeChoices[1],{});
});
test('invalid or excessive draft cannot restore',()=>{
  assert.equal(normalizeDraft({},6),null);
  assert.equal(normalizeDraft({trip:{destination:'x',date:'2026-09-23',days:7,travelers:1,budget:0}},6),null);
});
