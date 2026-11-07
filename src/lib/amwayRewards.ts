import { bonusPercent } from './amwayPlan';

/** Офіційний коефіцієнт BV/PV (Україна): 200 PV = 10 159,84 ₴ BV. */
export const BV_PER_PV = 50.7992;

/** «Шлях до Бронзи+»: кількість нових кваліфікованих НПА → сума, ₴. */
export const PATH_TO_BRONZE: Record<number, number> = { 3: 2300, 4: 3000, 5: 3950, 6: 5150 };

export interface RewardInput {
  personalPv: number;
  customerPv: number;
  legs: { name: string; pv: number; isNew?: boolean }[];
  /** Чи були ви на рівні 0–12% у період програми «Шлях до Бронзи+». */
  pathEligible?: boolean;
  bvRate?: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcRewards(i: RewardInput) {
  const rate = i.bvRate ?? BV_PER_PV;
  const ownPv = i.personalPv + i.customerPv;
  const groupPv = ownPv + i.legs.reduce((s, l) => s + l.pv, 0);
  const pct = bonusPercent(groupPv);
  const legs = i.legs.map((l) => {
    const lp = bonusPercent(l.pv);
    const bv = r2(l.pv * rate);
    return { ...l, pct: lp, bv, diff: r2(Math.max(0, pct - lp) / 100 * bv) };
  });
  const personal = r2(pct / 100 * ownPv * rate);
  const performance = r2(personal + legs.reduce((s, l) => s + l.diff, 0));
  const ppvOk = i.personalPv >= 100;
  const foundation = ppvOk && pct >= 9 && legs.filter((l) => l.pct >= 3).length >= 3;
  const builder = ppvOk && pct >= 15 && legs.filter((l) => l.pct >= 6).length >= 3;
  const foundationSum = foundation ? r2(performance * 0.3) : 0;
  const builderSum = builder ? r2(performance * 0.4) : 0;
  const newQ = Math.min(6, legs.filter((l) => l.isNew && l.pv >= 100).length);
  const path = i.pathEligible && ppvOk && pct <= 12 ? PATH_TO_BRONZE[newQ] ?? 0 : 0;
  const monthly = r2(performance + foundationSum + builderSum + path);
  return {
    groupPv, groupBv: r2(groupPv * rate), pct, legs, personal, performance,
    foundation, builder, foundationSum, builderSum, newQ, path, monthly,
    yearly: r2(monthly * 12), qMonth: groupPv >= 10000 || legs.some((l) => l.pct >= 21) && ownPv + legs.filter((l) => l.pct < 21).reduce((s, l) => s + l.pv, 0) >= 4000,
  };
}
