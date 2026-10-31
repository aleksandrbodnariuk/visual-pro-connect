import { test } from "node:test";
import assert from "node:assert/strict";
import { filterFriendsByList } from "./friendLists";

const friends = [{ id: "a" }, { id: "b" }, { id: "c" }];
const memberships = [
  { list_id: "family", friend_id: "a" },
  { list_id: "colleagues", friend_id: "a" },
  { list_id: "colleagues", friend_id: "b" },
];

test("'Всі' shows every friend", () => {
  assert.deepEqual(filterFriendsByList(friends, memberships, "all").map((f) => f.id), ["a", "b", "c"]);
});

test("a selected list shows only its friends", () => {
  assert.deepEqual(filterFriendsByList(friends, memberships, "colleagues").map((f) => f.id), ["a", "b"]);
});

test("one friend can be in several lists at once", () => {
  assert.deepEqual(filterFriendsByList(friends, memberships, "family").map((f) => f.id), ["a"]);
  assert.ok(filterFriendsByList(friends, memberships, "colleagues").some((f) => f.id === "a"));
});
