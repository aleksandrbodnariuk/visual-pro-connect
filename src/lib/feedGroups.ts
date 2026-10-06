/** Unique group ids from approved membership rows. */
export function getFeedGroupIds(rows: { group_id: string | null }[]): string[] {
  return [...new Set(rows.map((r) => r.group_id).filter(Boolean) as string[])];
}

/** PostgREST `or` filter: posts without a group, or posts from joined groups. */
export function buildFeedGroupFilter(groupIds: string[]): string {
  if (groupIds.length === 0) return "group_id.is.null";
  return `group_id.is.null,group_id.in.(${groupIds.join(",")})`;
}
