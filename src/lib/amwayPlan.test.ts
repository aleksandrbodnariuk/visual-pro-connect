import { describe, it, expect } from 'vitest';
import { bonusPercent, differentialBonus, groupPv, nextLevel } from './amwayPlan';

describe('amwayPlan', () => {
  it('шкала відсотків', () => {
    expect(bonusPercent(199)).toBe(0);
    expect(bonusPercent(200)).toBe(3);
    expect(bonusPercent(1200)).toBe(9);
    expect(bonusPercent(4000)).toBe(15);
    expect(bonusPercent(10000)).toBe(21);
  });
  it('наступний рівень', () => {
    expect(nextLevel(1155)).toEqual({ pct: 9, missing: 45 });
    expect(nextLevel(12000)).toBeNull();
  });
  it('диференційний бонус', () => {
    const nodes = [
      { id: 'me', sponsor_id: null, personal_pv: 200 },
      { id: 'a', sponsor_id: 'me', personal_pv: 600 },
      { id: 'b', sponsor_id: 'me', personal_pv: 400 },
    ];
    expect(groupPv(nodes, 'me')).toBe(1200);
    // 1200×9% − 600×6% − 400×3% = 108 − 36 − 12 = 60
    expect(differentialBonus(nodes, 'me')).toBe(60);
  });
});
