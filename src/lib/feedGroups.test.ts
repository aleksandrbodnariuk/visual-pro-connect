import { test, expect } from "bun:test";
import { buildFeedGroupFilter, getFeedGroupIds } from "./feedGroups";

test("non-member sees only posts without a group", () => {
  expect(buildFeedGroupFilter([])).toBe("group_id.is.null");
});

test("member also sees posts of joined groups", () => {
  expect(buildFeedGroupFilter(["a", "b"])).toBe("group_id.is.null,group_id.in.(a,b)");
});

test("membership ids are deduplicated", () => {
  expect(getFeedGroupIds([{ group_id: "a" }, { group_id: "a" }, { group_id: null }])).toEqual(["a"]);
});
