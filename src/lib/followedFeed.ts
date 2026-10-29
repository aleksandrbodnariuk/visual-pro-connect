/** Posts from followed people stay "fresh" (pinned above others) for this long. */
export const FOLLOWED_FRESH_HOURS = 72;
export const FOLLOWED_PRIORITY_LIMIT = 10;

export function followedSinceIso(now: Date = new Date()): string {
  return new Date(now.getTime() - FOLLOWED_FRESH_HOURS * 3600_000).toISOString();
}

/**
 * Facebook-style ordering: fresh posts of followed people first (newest first),
 * then the regular chronological feed without duplicates.
 */
export function mergeFollowedFirst<T extends { id: string; created_at: string }>(
  followed: T[],
  regular: T[],
): T[] {
  const top = [...followed].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const seen = new Set(top.map((p) => p.id));
  return [...top, ...regular.filter((p) => !seen.has(p.id))];
}
