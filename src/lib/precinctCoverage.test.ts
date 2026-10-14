import { test } from "node:test";
import assert from "node:assert/strict";
import { coverageStatus, matchesFilter } from "./precinctCoverage.ts";

const q = { observer: 2, commission: 1, media: 0 };

test("full when every required quota met", () => {
  assert.equal(coverageStatus({ observer: 2, commission: 1, media: 0 }, q), "full");
});
test("partial when below observer quota", () => {
  assert.equal(coverageStatus({ observer: 1, commission: 1, media: 0 }, q), "partial");
});
test("empty when nobody assigned", () => {
  assert.equal(coverageStatus({ observer: 0, commission: 0, media: 0 }, q), "empty");
});
test("no_observer filter catches under-quota precincts", () => {
  assert.equal(matchesFilter({ observer: 1, commission: 1, media: 0 }, q, "no_observer"), true);
  assert.equal(matchesFilter({ observer: 2, commission: 1, media: 0 }, q, "no_observer"), false);
});
test("has_media requires at least one media person", () => {
  assert.equal(matchesFilter({ observer: 0, commission: 0, media: 1 }, q, "has_media"), true);
  assert.equal(matchesFilter({ observer: 0, commission: 0, media: 0 }, q, "has_media"), false);
});
