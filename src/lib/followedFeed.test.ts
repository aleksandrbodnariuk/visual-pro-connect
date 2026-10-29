import { test } from "node:test";
import assert from "node:assert/strict";
import { followedSinceIso, mergeFollowedFirst } from "./followedFeed";

test("followed posts come before newer posts of others", () => {
  const followed = [{ id: "f1", created_at: "2026-10-28T10:00:00Z" }];
  const regular = [
    { id: "o1", created_at: "2026-10-29T10:00:00Z" },
    { id: "f1", created_at: "2026-10-28T10:00:00Z" },
  ];
  assert.deepEqual(mergeFollowedFirst(followed, regular).map((p) => p.id), ["f1", "o1"]);
});

test("followed posts are fresh for 72 hours", () => {
  assert.equal(followedSinceIso(new Date("2026-10-29T12:00:00Z")), "2026-10-26T12:00:00.000Z");
});
