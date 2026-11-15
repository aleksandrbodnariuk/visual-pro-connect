/** Read-only preview of an asset upgrade; the database RPC is the source of truth. */
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function upgradeExtra(newPrice: number, saleAmount: number) {
  return round2(Math.max(0, (newPrice || 0) - (saleAmount || 0)));
}

export function sharesForAmount(amount: number, sharePrice: number) {
  if (!sharePrice || sharePrice <= 0 || !amount) return 0;
  return round4(amount / sharePrice);
}

/** Split an amount equally to the cent; remainder cents go to the first people. */
export function splitEqually(total: number, count: number): number[] {
  if (count <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const rest = cents - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i < rest ? 1 : 0)) / 100);
}

export function formatShares(n: number) {
  return Number(n || 0).toLocaleString("uk-UA", { maximumFractionDigits: 4 });
}
