import { test } from "node:test";
import assert from "node:assert/strict";
import { precinctProtocol, precinctTurnout } from "./electionSim.ts";

test("turnout never decreases from 12 to 16 to 20", () => {
  for (let i = 0; i < 200; i++) {
    const t = precinctTurnout("p" + i, 1500);
    assert.ok(t["12"] <= t["16"] && t["16"] <= t["20"]);
    assert.ok(t["20"] <= 1500);
  }
});

test("protocol votes plus invalid equal issued ballots", () => {
  for (let i = 0; i < 200; i++) {
    const p = precinctProtocol("p" + i, 1200, ["a", "b", "c", "d"]);
    const sum = Object.values(p.votes).reduce((a, b) => a + b, 0);
    assert.equal(sum + p.invalid_ballots, p.ballots_issued);
  }
});

test("issued ballots match the 20:00 turnout", () => {
  assert.equal(precinctProtocol("x", 900, ["a"]).ballots_issued, precinctTurnout("x", 900)["20"]);
});
