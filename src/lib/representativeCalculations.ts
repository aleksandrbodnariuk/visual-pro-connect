/**
 * Модуль обчислень для системи представників.
 * Чисті функції — не залежать від UI, Supabase чи конкретного компонента.
 *
 * Ланцюг виплат (від net_profit):
 *   representative (прямий) → 5%
 *   manager (parent)        → 3%
 *   director (grandparent)  → 2%
 *   Макс. сумарно           → 10%
 *
 * Залишок після відрахування представників
 * передається в існуючу формулу акціонерів (50/20/17.5/12.5).
 */

// ─── Константи ───────────────────────────────────────────────────────────────

/** Максимальний сумарний відсоток представників */
export const REP_MAX_PERCENT = 0.10;

// ─── Типи ────────────────────────────────────────────────────────────────────

export interface RepresentativeChainNode {
  representativeId: string;
  userId: string;
  role: string; // 'representative' | 'manager' | 'director'
}

export interface RepresentativeDeduction {
  representativeId: string;
  userId: string;
  role: string;
  percent: number;
  amount: number;
}

export interface RepresentativePoolResult {
  /** Загальний % представників від net_profit */
  totalPercent: number;
  /** Загальна сума відрахувань представників */
  totalAmount: number;
  /** Net profit після відрахування представників (для акціонерів) */
  netProfitAfterReps: number;
  /** Деталізація по кожному учаснику ланцюга */
  deductions: RepresentativeDeduction[];
}

// ─── Визначення відсотків за комбінацією ─────────────────────────────────────

/**
 * Визначає відсотки для кожної ролі залежно від комбінації в ланцюгу:
 *
 *   A) тільки representative           → rep 5%
 *   B) representative + manager         → rep 5%, manager 3%
 *   C) manager без director             → manager 8%
 *   D) тільки director                  → director 10%
 *   E) representative + manager + director → rep 5%, manager 3%, director 2%
 *   F) manager + director               → manager 8%, director 2%
 *
 * Загальний % ніколи не перевищує 10%.
 */
function resolvePercents(chain: RepresentativeChainNode[]): Map<string, number> {
  const hasRep = chain.some(n => n.role === 'representative');
  const hasManager = chain.some(n => n.role === 'manager');
  const hasDirector = chain.some(n => n.role === 'director');

  const percents = new Map<string, number>();

  if (hasRep && hasManager && hasDirector) {
    // E) rep 5% + manager 3% + director 2% = 10%
    percents.set('representative', 0.05);
    percents.set('manager', 0.03);
    percents.set('director', 0.02);
  } else if (hasRep && hasManager) {
    // B) rep 5% + manager 3% = 8%
    percents.set('representative', 0.05);
    percents.set('manager', 0.03);
  } else if (hasManager && hasDirector) {
    // F) manager 8% + director 2% = 10%
    percents.set('manager', 0.08);
    percents.set('director', 0.02);
  } else if (hasRep) {
    // A) rep 5%
    percents.set('representative', 0.05);
  } else if (hasManager) {
    // C) manager 8%
    percents.set('manager', 0.08);
  } else if (hasDirector) {
    // D) director 10%
    percents.set('director', 0.10);
  }

  return percents;
}

// ─── Обчислення ──────────────────────────────────────────────────────────────

/**
 * Розрахунок відрахувань представників від net_profit.
 *
 * @param netProfit      Чистий прибуток замовлення (order_amount - expenses)
 * @param chain          Ланцюг представників (representative → manager → director)
 *
 * Якщо chain порожній або netProfit <= 0, повертає нульовий результат.
 */
export function calcRepresentativePool(
  netProfit: number,
  chain: RepresentativeChainNode[],
): RepresentativePoolResult {
  if (netProfit <= 0 || chain.length === 0) {
    return {
      totalPercent: 0,
      totalAmount: 0,
      netProfitAfterReps: netProfit,
      deductions: [],
    };
  }

  const percents = resolvePercents(chain);
  const deductions: RepresentativeDeduction[] = [];

  for (const node of chain) {
    const percent = percents.get(node.role) ?? 0;
    if (percent <= 0) continue;

    deductions.push({
      representativeId: node.representativeId,
      userId: node.userId,
      role: node.role,
      percent,
      amount: netProfit * percent,
    });
  }

  const totalAmount = deductions.reduce((sum, d) => sum + d.amount, 0);
  const totalPercent = deductions.reduce((sum, d) => sum + d.percent, 0);

  return {
    totalPercent: Math.min(totalPercent, REP_MAX_PERCENT),
    totalAmount: Math.min(totalAmount, netProfit * REP_MAX_PERCENT),
    netProfitAfterReps: Math.max(0, netProfit - Math.min(totalAmount, netProfit * REP_MAX_PERCENT)),
    deductions,
  };
}

// ─── Комбінований розрахунок ─────────────────────────────────────────────────

import {
  calcNetProfit,
  calcFullProfitDistribution,
  type ProfitDistribution,
  type ShareholderInput,
} from './shareholderCalculations';

export interface FullDistributionWithReps extends ProfitDistribution {
  /** Дані відрахування представників (до розподілу акціонерам) */
  representativePool: RepresentativePoolResult;
  /** Оригінальний net profit (до відрахування представників) */
  originalNetProfit: number;
}

/**
 * Повний розподіл прибутку з урахуванням представників.
 *
 * Порядок:
 *   1. net_profit = order_amount - expenses
 *   2. Відрахування представників (5%/3%/2% по ланцюгу)
 *   3. Залишок → існуюча формула (50/20/17.5/12.5)
 *
 * Якщо chain порожній, поведінка ідентична calcFullProfitDistribution.
 */
export function calcFullDistributionWithReps(
  orderAmount: number,
  expenses: number,
  shareholders: ShareholderInput[],
  totalShares: number,
  repChain: RepresentativeChainNode[],
): FullDistributionWithReps {
  const originalNetProfit = calcNetProfit(orderAmount, expenses);
  const repPool = calcRepresentativePool(originalNetProfit, repChain);

  // Pass the reduced profit to the existing shareholder formula
  // We recalculate using the adjusted amounts so the existing function works unchanged
  const adjustedOrderAmount = repPool.netProfitAfterReps + expenses;
  const shareholderDist = calcFullProfitDistribution(adjustedOrderAmount, expenses, shareholders, totalShares);

  return {
    ...shareholderDist,
    representativePool: repPool,
    originalNetProfit,
  };
}
