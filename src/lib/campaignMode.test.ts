import { describe, expect, it } from 'vitest';
import { campaignPrecincts } from './campaignMode';
const all = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
describe('campaignPrecincts', () => {
  it('real campaign uses every precinct even with a list', () => expect(campaignPrecincts(all, 'real', ['a']).length).toBe(3));
  it('test campaign uses only chosen precincts', () => expect(campaignPrecincts(all, 'test', ['a', 'c']).map((p) => p.id)).toEqual(['a', 'c']));
  it('training without a selection uses the whole structure', () => expect(campaignPrecincts(all, 'training', null).length).toBe(3));
});
