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
  /** Скільки витрат покрито з unallocated_funds */
  coveredFromFund: number;
  /** Залишок витрат (покрито з прибутку) */
  remainingExpenses: number;
  /** Баланс unallocated_funds після операції */
  unallocatedFundsAfter: number;
}

/**
 * Повний розподіл прибутку з урахуванням unallocated_funds та представників.
 *
 * Порядок:
 *   1. Витрати покриваються з unallocated_funds
 *   2. Якщо не вистачає — різниця з order_amount
 *   3. Відрахування представників (5%/3%/2% по ланцюгу)
 *   4. Залишок → існуюча формула (50/20/17.5/12.5)
 *   5. admin_fund (12.5%) повертається в unallocated_funds
 *
 * Це КЛІЄНТСЬКИЙ preview — реальний розрахунок виконується серверною
 * функцією process_order_profit().
 */
export function calcFullDistributionWithReps(
  orderAmount: number,
  expenses: number,
  shareholders: ShareholderInput[],
  totalShares: number,
  repChain: RepresentativeChainNode[],
  unallocatedFunds: number = 0,
): FullDistributionWithReps {
  // STEP 1: Cover expenses from unallocated_funds
  const coveredFromFund = Math.min(unallocatedFunds, expenses);
  const remainingExpenses = expenses - coveredFromFund;
  let fundBalance = unallocatedFunds - coveredFromFund;

  // STEP 2: Net profit with adjusted expenses
  const originalNetProfit = Math.max(0, orderAmount - remainingExpenses);

  // STEP 3: Representative pool
  const repPool = calcRepresentativePool(originalNetProfit, repChain);

  // STEP 4: Shareholder distribution (UNCHANGED formula)
  const adjustedOrderAmount = repPool.netProfitAfterReps + remainingExpenses;
  const shareholderDist = calcFullProfitDistribution(adjustedOrderAmount, remainingExpenses, shareholders, totalShares);

  // STEP 5: admin_fund goes back to unallocated_funds
  fundBalance += shareholderDist.adminFund;

  return {
    ...shareholderDist,
    representativePool: repPool,
    originalNetProfit,
    coveredFromFund,
    remainingExpenses,
    unallocatedFundsAfter: fundBalance,
  };
}
