export interface MergePhoto { url: string; label: string; author_id?: string | null; author_name?: string | null; created_at?: string | null }

/**
 * Зливає фото протоколу: зберігає фото колег, завантажені паралельно,
 * і видаляє лише ті, які користувач свідомо прибрав у своєму вікні.
 */
export function mergeProtocolPhotos(server: MergePhoto[], original: MergePhoto[], edited: MergePhoto[]): MergePhoto[] {
  const removed = new Set(original.map((p) => p.url).filter((u) => !edited.some((e) => e.url === u)));
  const out = [...edited];
  const seen = new Set(edited.map((p) => p.url));
  for (const p of server) if (!seen.has(p.url) && !removed.has(p.url)) { out.push(p); seen.add(p.url); }
  return out;
}
