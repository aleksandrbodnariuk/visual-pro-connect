import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { campaignPrecincts } from "./campaignMode.ts";

const all = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("campaignPrecincts", () => {
  test("real campaign uses every precinct even with a list", () => assert.equal(campaignPrecincts(all, "real", ["a"]).length, 3));
  test("test campaign uses only chosen precincts", () => assert.deepEqual(campaignPrecincts(all, "test", ["a", "c"]).map((p) => p.id), ["a", "c"]));
  test("training without a selection uses the whole structure", () => assert.equal(campaignPrecincts(all, "training", null).length, 3));
});
