import { describe, it, expect } from "vitest";
import { buildDays, longestStreak, activityIndex } from "./activityScore";

describe("activityScore", () => {
  it("counts longest streak", () => {
    const d = buildDays(new Date("2026-01-01"), new Date("2026-01-05"));
    [0, 1, 3, 4].forEach((i) => (d[i].visited = true));
    expect(d.length).toBe(5);
    expect(longestStreak(d)).toBe(2);
  });
  it("regularity alone gives 40", () => {
    const d = buildDays(new Date("2026-01-01"), new Date("2026-01-10"));
    d.forEach((x) => (x.visited = true));
    expect(activityIndex(d)).toBe(40);
  });
  it("maxed everything gives 100", () => {
    const d = buildDays(new Date("2026-01-01"), new Date("2026-01-02"));
    d.forEach((x) => { x.visited = true; x.posts = 1; x.views = 10; });
    expect(activityIndex(d)).toBe(100);
  });
});
