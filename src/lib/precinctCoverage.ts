export interface Quotas { observer: number; commission: number; media: number }
export type CoverageCounts = { observer: number; commission: number; media: number };
export type CoverageStatus = 'full' | 'partial' | 'empty';
export type CoverageFilter =
  | 'all' | 'needs' | 'full'
  | 'no_observer' | 'no_commission' | 'no_media'
  | 'has_observer' | 'has_commission' | 'has_media';

const ROLES = ['observer', 'commission', 'media'] as const;

/** Категорія заповнена, якщо людей не менше за норму (норма 0 — не вимагається). */
export const isFilled = (c: CoverageCounts, q: Quotas, r: typeof ROLES[number]) => c[r] >= q[r];

export function coverageStatus(c: CoverageCounts, q: Quotas): CoverageStatus {
  const required = ROLES.filter((r) => q[r] > 0);
  if (required.length && required.every((r) => isFilled(c, q, r))) return 'full';
  if (c.observer + c.commission + c.media === 0) return 'empty';
  return required.length ? 'partial' : 'full';
}

export function matchesFilter(c: CoverageCounts, q: Quotas, f: CoverageFilter): boolean {
  switch (f) {
    case 'all': return true;
    case 'full': return coverageStatus(c, q) === 'full';
    case 'needs': return coverageStatus(c, q) !== 'full';
    case 'no_observer': return !isFilled(c, q, 'observer') || (q.observer === 0 && c.observer === 0);
    case 'no_commission': return !isFilled(c, q, 'commission') || (q.commission === 0 && c.commission === 0);
    case 'no_media': return !isFilled(c, q, 'media') || (q.media === 0 && c.media === 0);
    case 'has_observer': return c.observer > 0 && isFilled(c, q, 'observer');
    case 'has_commission': return c.commission > 0 && isFilled(c, q, 'commission');
    case 'has_media': return c.media > 0 && isFilled(c, q, 'media');
  }
}

/** Числове сортування номерів дільниць. */
export const comparePrecinctNumber = (a: string, b: string) =>
  a.localeCompare(b, 'uk', { numeric: true });
