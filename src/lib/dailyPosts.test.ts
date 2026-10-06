import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getDailyPostWindow } from "./dailyPosts";

describe("Popular posts are limited to today's calendar day", () => {
  test("uses midnight through the next midnight, not the past 24 hours", () => {
    const now = new Date(2026, 9, 6, 15, 0);
    const { start, end } = getDailyPostWindow(now);
    assert.equal(new Date(start).getTime(), new Date(2026, 9, 6, 0, 0).getTime());
    assert.equal(new Date(end).getTime(), new Date(2026, 9, 7, 0, 0).getTime());
    assert.notEqual(new Date(start).getTime(), now.getTime() - 86400000);
  });
});