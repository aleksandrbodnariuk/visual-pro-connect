/** Пошук замовлення: число (з/без «№», «#») — точний номер; інакше — фрагмент назви. */
export function matchOrderRef(o: { order_number: number | null; title: string }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const num = q.replace(/^(№|#)\s*/, '');
  if (/^\d+$/.test(num)) return o.order_number === Number(num);
  return o.title.toLowerCase().includes(q);
}
