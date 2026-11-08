import { describe, it, expect } from 'vitest';
import { subtreeIds, membersInScope, statusCounts } from './partyStats';

const hqs: any[] = [
  { id: 'c', parent_id: null, level: 'central', name: 'Центр' },
  { id: 'o1', parent_id: 'c', level: 'oblast', name: 'Чернівецька' },
  { id: 'r1', parent_id: 'o1', level: 'okrug', name: 'Сокирянський' },
  { id: 'o2', parent_id: 'c', level: 'oblast', name: 'Львівська' },
];
const members: any[] = [
  { id: '1', unit_name: 'Сокирянський', status: 'active' },
  { id: '2', unit_name: 'чернівецька', status: 'candidate' },
  { id: '3', unit_name: 'Львівська', status: 'active' },
];

describe('partyStats', () => {
  it('обласний голова бачить лише свою область і райони', () => {
    const scoped = membersInScope(members, hqs, subtreeIds(hqs, 'o1'));
    expect(scoped.map((m) => m.id)).toEqual(['1', '2']);
  });
  it('рахує кандидатів окремо', () => {
    expect(statusCounts(members)).toEqual({ active: 2, candidate: 1, honorary: 0, suspended: 0 });
  });
});

import { unmatchedMembers } from './partyStats';
describe('unmatchedMembers', () => {
  it('знаходить членів без відповідного штабу', () => {
    const hqs = [{ id: 'a', name: 'Хотинська', parent_id: null, level: 'raion' }] as any;
    const ms = [{ unit_name: ' хотинська ' }, { unit_name: 'Невідома' }, { unit_name: null }] as any;
    expect(unmatchedMembers(ms, hqs)).toHaveLength(2);
  });
});
