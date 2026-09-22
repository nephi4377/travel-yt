import assert from 'node:assert/strict';
import {test} from 'node:test';
import {describeRouteTradeoff} from './reasons.js';
import {mockRoutes} from './engine.js';

test('route explanation compares group money, time and walking',()=>{
  const options=mockRoutes['station-market'];
  assert.match(describeRouteTradeoff(options[0],options,5),/全團費用最低/);
  assert.match(describeRouteTradeoff(options[2],options,5),/移動時間最短/);
  assert.match(describeRouteTradeoff(options[2],options,5),/步行最少/);
});
