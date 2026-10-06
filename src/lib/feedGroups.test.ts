import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFeedGroupFilter, getFeedGroupIds } from "./feedGroups";

test("non-member sees only posts without a group", () => {
  assert.equal(buildFeedGroupFilter([]), "group_id.is.null");
});

test("member also sees posts of joined groups", () => {
  assert.equal(buildFeedGroupFilter(["a", "b"]), "group_id.is.null,group_id.in.(a,b)");
});

test("membership ids are deduplicated", () => {
  assert.deepEqual(getFeedGroupIds([{ group_id: "a" }, { group_id: "a" }, { group_id: null }]), ["a"]);
});
