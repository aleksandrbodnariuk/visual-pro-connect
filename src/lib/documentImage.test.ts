import { describe, it, expect } from 'vitest';
import { PROFILES, targetSize } from './documentImage';

describe('профілі стиснення', () => {
  it('протокол зберігає довгу сторону А4 при 300 DPI (3508px)', () => {
    expect(PROFILES.document.maxSide).toBe(3508);
    expect(targetSize(4000, 3000, PROFILES.document.maxSide)).toEqual({ width: 3508, height: 2631 });
  });
  it('символіка обмежується 2560px', () => {
    expect(targetSize(5000, 2500, PROFILES.symbol.maxSide)).toEqual({ width: 2560, height: 1280 });
  });
  it('малі зображення не збільшуються', () => {
    expect(targetSize(1200, 800, 3508)).toEqual({ width: 1200, height: 800 });
  });
});
