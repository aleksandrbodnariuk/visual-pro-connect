/** Читає всі рядки сторінками по 1000 (обмеження сервера), щоб табло бачило всі дільниці. */
export async function fetchPaged<T = any>(build: () => any, max = 20000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error || !data?.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}
