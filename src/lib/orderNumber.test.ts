import { describe, it, expect } from 'vitest';
import { matchOrderRef } from './orderNumber';

const o = { order_number: 12, title: 'Весільна зйомка' };
describe('matchOrderRef', () => {
  it('matches exact number with №', () => expect(matchOrderRef(o, '№12')).toBe(true));
  it('does not match partial number', () => expect(matchOrderRef(o, '1')).toBe(false));
  it('matches title fragment', () => expect(matchOrderRef(o, 'весільна')).toBe(true));
});
