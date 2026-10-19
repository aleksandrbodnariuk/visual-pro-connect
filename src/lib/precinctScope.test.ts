import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunk, resolvePrecinctScope } from './precinctScope';

const hqs = [
  { id: 'oblast', parent_id: null },
  { id: 'okrug201', parent_id: 'oblast' },
  { id: 'city1', parent_id: 'okrug201' },
  { id: 'okrug202', parent_id: 'oblast' },
];

test('спостерігач отримує лише свою дільницю', () => {
  assert.deepEqual(resolvePrecinctScope({ isAdmin: false, managedHqIds: [], hqs, myPrecinctIds: ['p1'] }),
    { kind: 'precincts', precinctIds: ['p1'] });
});
test('окружний штаб отримує лише свій округ з підлеглими штабами', () => {
  const s = resolvePrecinctScope({ isAdmin: false, managedHqIds: ['okrug201'], hqs, myPrecinctIds: [] });
  assert.equal(s.kind, 'hqs');
  assert.deepEqual(s.kind === 'hqs' && [...s.hqIds].sort(), ['city1', 'okrug201']);
});
test('адміністратор отримує всі дільниці', () => {
  assert.deepEqual(resolvePrecinctScope({ isAdmin: true, managedHqIds: [], hqs, myPrecinctIds: ['p1'] }), { kind: 'all' });
});
test('chunk ділить на частини', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});
