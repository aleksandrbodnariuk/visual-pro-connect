import { describe, expect, test } from "bun:test";
import { getDailyPostWindow } from "./dailyPosts";

describe("Popular posts are limited to today's calendar day", () => {
  test("uses midnight through the next midnight, not the past 24 hours", () => {
    const now = new Date(2026, 9, 6, 15, 0);
    const { start, end } = getDailyPostWindow(now);
    expect(new Date(start).getTime()).toBe(new Date(2026, 9, 6, 0, 0).getTime());
    expect(new Date(end).getTime()).toBe(new Date(2026, 9, 7, 0, 0).getTime());
    expect(new Date(start).getTime()).not.toBe(now.getTime() - 86400000);
  });
});