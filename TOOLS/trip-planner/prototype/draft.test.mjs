import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isValidCalendarDate,normalizeDraft} from './draft.js';

test('trip dates must be real calendar dates',()=>{
  assert.equal(isValidCalendarDate('2028-02-29'),true);
  assert.equal(isValidCalendarDate('2026-02-29'),false);
  assert.equal(isValidCalendarDate('2026-02-30'),false);
  assert.equal(isValidCalendarDate('2026-13-01'),false);
});

test('valid session draft restores bounded trip data',()=>{
  const restored=normalizeDraft({trip:{destination:'釜山',date:'2026-09-23',days:2,travelers:5,budget:40000},words:['舒服'],activeDay:1,adjustments:[{}, {rain:true}],routeChoices:[{'0':2},{'0':99}]},6);
  assert.equal(restored.activeDay,1);
  assert.equal(restored.adjustments[1].rain,true);
  assert.deepEqual(restored.routeChoices[1],{});
});
test('invalid or excessive draft cannot restore',()=>{
  assert.equal(normalizeDraft({},6),null);
  assert.equal(normalizeDraft({trip:{destination:'x',date:'2026-09-23',days:7,travelers:1,budget:0}},6),null);
  assert.equal(normalizeDraft({trip:{destination:'x',date:'2026-02-30',days:1,travelers:1,budget:0}},6),null);
});
