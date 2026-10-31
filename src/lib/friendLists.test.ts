import { describe, it, expect } from "vitest";
import { filterFriendsByList } from "./friendLists";

const friends = [{ id: "a" }, { id: "b" }, { id: "c" }];
const memberships = [
  { list_id: "family", friend_id: "a" },
  { list_id: "colleagues", friend_id: "a" },
  { list_id: "colleagues", friend_id: "b" },
];

describe("filterFriendsByList", () => {
  it("'Всі' shows every friend", () => {
    expect(filterFriendsByList(friends, memberships, "all").map((f) => f.id)).toEqual(["a", "b", "c"]);
  });
  it("a selected list shows only its friends", () => {
    expect(filterFriendsByList(friends, memberships, "colleagues").map((f) => f.id)).toEqual(["a", "b"]);
  });
  it("one friend can be in several lists at once", () => {
    expect(filterFriendsByList(friends, memberships, "family").map((f) => f.id)).toEqual(["a"]);
    expect(filterFriendsByList(friends, memberships, "colleagues").map((f) => f.id)).toContain("a");
  });
});
