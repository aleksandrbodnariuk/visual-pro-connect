import { describe, it, expect } from 'vitest';
import { coverageStatus, matchesFilter } from './precinctCoverage';

const q = { observer: 2, commission: 1, media: 0 };

describe('precinctCoverage', () => {
  it('full when every required quota met', () => {
    expect(coverageStatus({ observer: 2, commission: 1, media: 0 }, q)).toBe('full');
  });
  it('partial when below observer quota', () => {
    expect(coverageStatus({ observer: 1, commission: 1, media: 0 }, q)).toBe('partial');
  });
  it('empty when nobody assigned', () => {
    expect(coverageStatus({ observer: 0, commission: 0, media: 0 }, q)).toBe('empty');
  });
  it('no_observer filter catches under-quota precincts', () => {
    expect(matchesFilter({ observer: 1, commission: 1, media: 0 }, q, 'no_observer')).toBe(true);
    expect(matchesFilter({ observer: 2, commission: 1, media: 0 }, q, 'no_observer')).toBe(false);
  });
  it('has_media requires at least one media person', () => {
    expect(matchesFilter({ observer: 0, commission: 0, media: 1 }, q, 'has_media')).toBe(true);
    expect(matchesFilter({ observer: 0, commission: 0, media: 0 }, q, 'has_media')).toBe(false);
  });
});
