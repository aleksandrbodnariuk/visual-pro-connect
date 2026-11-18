export type ActivityKind = "views" | "posts" | "comments" | "likes" | "messages";
export interface DayBucket { date: string; visited: boolean; views: number; posts: number; comments: number; likes: number; messages: number; }

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function buildDays(from: Date, to: Date): DayBucket[] {
  const out: DayBucket[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (d <= to) {
    out.push({ date: dayKey(d), visited: false, views: 0, posts: 0, comments: 0, likes: 0, messages: 0 });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Longest run of consecutive visited days. */
export function longestStreak(days: DayBucket[]): number {
  let best = 0, cur = 0;
  for (const d of days) { cur = d.visited ? cur + 1 : 0; if (cur > best) best = cur; }
  return best;
}

/** Index 0-100: 40% regularity, 35% contribution, 25% depth. */
export function activityIndex(days: DayBucket[]): number {
  if (!days.length) return 0;
  const active = days.filter((d) => d.visited).length;
  const regularity = active / days.length;
  const contrib = days.reduce((s, d) => s + d.posts * 5 + d.comments * 2 + d.likes + d.messages * 0.5, 0);
  const contribution = Math.min(1, contrib / days.length / 3); // 3 pts/day = max
  const views = days.reduce((s, d) => s + d.views, 0);
  const depth = active ? Math.min(1, views / active / 10) : 0; // 10 pages/visit = max
  return Math.round((regularity * 0.4 + contribution * 0.35 + depth * 0.25) * 100);
}

export function indexLabel(i: number): string {
  if (i >= 70) return "Дуже активний";
  if (i >= 45) return "Активний";
  if (i >= 20) return "Помірний";
  return "Пасивний";
}
