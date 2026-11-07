import { describe, expect, it } from 'vitest';
import { calcRewards } from './amwayRewards';

const legs = [200, 200, 200, 600, 600, 1200, 1000, 0].map((pv, k) => ({ name: `F${k}`, pv }));

describe('calcRewards', () => {
  it('matches the official example (15%, Bronze +70%)', () => {
    const r = calcRewards({ personalPv: 100, customerPv: 0, legs });
    expect(r.groupPv).toBe(4100);
    expect(r.pct).toBe(15);
    expect(r.legs[0].diff).toBe(1219.18);
    expect(r.legs[6].diff).toBe(4571.93);
    expect(r.monthly).toBeCloseTo(30830.05, 0);
  });
  it('pays path to bronze for 4 new legs', () => {
    const r = calcRewards({ personalPv: 100, customerPv: 0, pathEligible: true, legs: [100, 100, 100, 100].map((pv) => ({ name: 'n', pv, isNew: true })) });
    expect(r.path).toBe(3000);
  });
  it('no bronze without 100 PPV', () => {
    expect(calcRewards({ personalPv: 50, customerPv: 0, legs }).foundation).toBe(false);
  });
});
