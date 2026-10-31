export const FRIEND_LIST_PRESETS = [
  "Знайомі",
  "Колеги",
  "Однокласники / Однокурсники",
  "Музиканти",
  "Родичі",
];

export const FRIEND_LIST_NAME_MAX = 50;

export interface FriendListMembership {
  list_id: string;
  friend_id: string;
}

/** "all" shows everyone; otherwise only friends tagged in the selected list. */
export function filterFriendsByList<T extends { id?: string | null }>(
  friends: T[],
  memberships: FriendListMembership[],
  listId: string | "all",
): T[] {
  if (listId === "all") return friends;
  const ids = new Set(memberships.filter((m) => m.list_id === listId).map((m) => m.friend_id));
  return friends.filter((f) => !!f.id && ids.has(f.id));
}

export function normalizeListName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, FRIEND_LIST_NAME_MAX);
}
