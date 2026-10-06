import { test } from 'node:test';
import assert from 'node:assert/strict';
import { precinctStatus, subtreeIds } from './precinctStatus.ts';

test('no reports = silent', () => assert.equal(precinctStatus([], false), 'silent'));
test('opened only', () => assert.equal(precinctStatus([{ kind: 'opened', slot: null }], false), 'opened'));
test('turnout at 12 = turnout', () => assert.equal(precinctStatus([{ kind: 'turnout', slot: '12' }], false), 'turnout'));
test('turnout at 20 = counting', () => assert.equal(precinctStatus([{ kind: 'turnout', slot: '20' }], false), 'counting'));
test('protocol wins', () => assert.equal(precinctStatus([], true), 'accepted'));
test('subtree includes grandchildren only', () => {
  const s = subtreeIds([{ id: 'a', parent_id: null }, { id: 'b', parent_id: 'a' }, { id: 'c', parent_id: 'b' }, { id: 'd', parent_id: null }], 'a');
  assert.deepEqual([...s].sort(), ['a', 'b', 'c']);
});
