/** Calendar day in the viewer's timezone, converted to UTC for stored timestamps. */
export function getDailyPostWindow(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function getPostExcerpt(content: string | null) {
  return content?.replace(/https?:\/\/\S+/g, "").trim() || "Публікація";
}