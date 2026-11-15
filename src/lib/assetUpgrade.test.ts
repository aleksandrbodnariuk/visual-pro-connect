import { describe, it, expect } from "vitest";
import { upgradeExtra, sharesForAmount, splitEqually } from "./assetUpgrade";

describe("asset upgrade", () => {
  it("sale amount stays with company, only difference is contribution", () => {
    expect(upgradeExtra(250, 100)).toBe(150);
  });
  it("150$ at 10$ per share issues 15 shares", () => {
    expect(sharesForAmount(150, 10)).toBe(15);
  });
  it("fractional shares are kept, not lost", () => {
    expect(sharesForAmount(100, 15)).toBe(6.6667);
  });
  it("two partners 90$ and 60$ get 9 and 6 shares", () => {
    expect(sharesForAmount(90, 10)).toBe(9);
    expect(sharesForAmount(60, 10)).toBe(6);
  });
  it("equal split sums exactly to the total", () => {
    const parts = splitEqually(100, 3);
    expect(parts).toEqual([33.34, 33.33, 33.33]);
  });
});
