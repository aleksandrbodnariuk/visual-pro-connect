import { describe, expect, it } from 'vitest';
import { chunk, resolvePrecinctScope } from './precinctScope';

const hqs = [
  { id: 'oblast', parent_id: null },
  { id: 'okrug201', parent_id: 'oblast' },
  { id: 'city1', parent_id: 'okrug201' },
  { id: 'okrug202', parent_id: 'oblast' },
];

describe('resolvePrecinctScope', () => {
  it('спостерігач отримує лише свою дільницю', () => {
    expect(resolvePrecinctScope({ isAdmin: false, managedHqIds: [], hqs, myPrecinctIds: ['p1'] }))
      .toEqual({ kind: 'precincts', precinctIds: ['p1'] });
  });
  it('окружний штаб отримує лише свій округ з підлеглими штабами', () => {
    const s = resolvePrecinctScope({ isAdmin: false, managedHqIds: ['okrug201'], hqs, myPrecinctIds: [] });
    expect(s.kind).toBe('hqs');
    expect(s.kind === 'hqs' && [...s.hqIds].sort()).toEqual(['city1', 'okrug201']);
  });
  it('адміністратор отримує всі дільниці', () => {
    expect(resolvePrecinctScope({ isAdmin: true, managedHqIds: [], hqs, myPrecinctIds: ['p1'] })).toEqual({ kind: 'all' });
  });
  it('chunk ділить на частини', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
