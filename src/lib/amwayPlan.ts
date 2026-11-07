/** Шкала бонусу за обсяг (Performance Bonus) — відсоток від групових балів. */
export const BONUS_SCALE: { pv: number; pct: number }[] = [
  { pv: 10000, pct: 21 },
  { pv: 7000, pct: 18 },
  { pv: 4000, pct: 15 },
  { pv: 2400, pct: 12 },
  { pv: 1200, pct: 9 },
  { pv: 600, pct: 6 },
  { pv: 200, pct: 3 },
];

export function bonusPercent(groupPv: number): number {
  return BONUS_SCALE.find((s) => groupPv >= s.pv)?.pct ?? 0;
}

/** Скільки балів не вистачає до наступного рівня (null — максимальний рівень). */
export function nextLevel(groupPv: number): { pct: number; missing: number } | null {
  const higher = [...BONUS_SCALE].reverse().find((s) => groupPv < s.pv);
  return higher ? { pct: higher.pct, missing: Math.ceil(higher.pv - groupPv) } : null;
}

export interface PlanNode {
  id: string;
  sponsor_id: string | null;
  personal_pv: number;
}

/** Групові бали вузла = особисті + вся глибина. */
export function groupPv(nodes: PlanNode[], id: string): number {
  const self = nodes.find((n) => n.id === id);
  if (!self) return 0;
  return Number(self.personal_pv) + nodes.filter((n) => n.sponsor_id === id).reduce((s, c) => s + groupPv(nodes, c.id), 0);
}

/**
 * Диференційний бонус: свій % × групові бали мінус % кожної особистої гілки × її бали.
 * Результат у балах; множиться на курс бал→грн.
 */
export function differentialBonus(nodes: PlanNode[], id: string): number {
  const total = groupPv(nodes, id);
  const own = bonusPercent(total);
  const legs = nodes.filter((n) => n.sponsor_id === id);
  const minus = legs.reduce((s, l) => {
    const lp = groupPv(nodes, l.id);
    return s + lp * Math.min(bonusPercent(lp), own);
  }, 0);
  return Math.max(0, (total * own - minus) / 100);
}
