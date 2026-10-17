import { test } from 'node:test';
import assert from 'node:assert/strict';
import { precinctMilestones, precinctStatus, subtreeIds } from './precinctStatus.ts';

test('no reports = silent', () => assert.equal(precinctStatus([], false), 'silent'));
test('opened only', () => assert.equal(precinctStatus([{ kind: 'opened', slot: null }], false), 'opened'));
test('turnout at 12 = turnout', () => assert.equal(precinctStatus([{ kind: 'turnout', slot: '12' }], false), 'turnout'));
test('turnout at 20 = counting', () => assert.equal(precinctStatus([{ kind: 'turnout', slot: '20' }], false), 'counting'));
test('protocol wins', () => assert.equal(precinctStatus([], true), 'accepted'));

test('opening remains counted after turnout is recorded', () => {
  assert.deepEqual(precinctMilestones([{ kind: 'opened', slot: null }, { kind: 'turnout', slot: '12' }], false),
    { silent: false, opened: true, turnout: true, counting: false, accepted: false });
});

test('opening and turnout remain counted during counting', () => {
  assert.deepEqual(precinctMilestones([{ kind: 'opened', slot: null }, { kind: 'turnout', slot: '12' }, { kind: 'turnout', slot: '20' }], false),
    { silent: false, opened: true, turnout: true, counting: true, accepted: false });
});

test('all recorded milestones remain counted after a protocol', () => {
  assert.deepEqual(precinctMilestones([{ kind: 'opened', slot: null }, { kind: 'turnout', slot: '20' }], true),
    { silent: false, opened: true, turnout: true, counting: true, accepted: true });
});

test('missing opening and turnout reports are not invented from a protocol', () => {
  assert.deepEqual(precinctMilestones([], true),
    { silent: false, opened: false, turnout: false, counting: true, accepted: true });
});

test('duplicate turnout reports count each milestone only once and reset clears it', () => {
  assert.deepEqual(precinctMilestones([{ kind: 'turnout', slot: '12' }, { kind: 'turnout', slot: '16' }], false),
    { silent: false, opened: false, turnout: true, counting: false, accepted: false });
  assert.deepEqual(precinctMilestones([], false),
    { silent: true, opened: false, turnout: false, counting: false, accepted: false });
});
test('subtree includes grandchildren only', () => {
  const s = subtreeIds([{ id: 'a', parent_id: null }, { id: 'b', parent_id: 'a' }, { id: 'c', parent_id: 'b' }, { id: 'd', parent_id: null }], 'a');
  assert.deepEqual([...s].sort(), ['a', 'b', 'c']);
});
