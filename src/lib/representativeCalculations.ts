/**
 * Модуль обчислень для системи представників.
 * Чисті функції — не залежать від UI, Supabase чи конкретного компонента.
 *
 * Ланцюг виплат (від net_profit):
 *   representative (прямий) → configurable (default 5%)
 *   manager (parent)        → configurable (default 3%)
 *   director (grandparent)  → configurable (default 2%)
 *   Макс. сумарно           → configurable (default 10%)
 *
 * Залишок після відрахування представників
 * передається в існуючу формулу акціонерів (50/20/17.5/12.5).
 */

// ─── Конфігурація ────────────────────────────────────────────────────────────

/** Конфігурація відсотків комісій представників (у частках, напр. 0.05 = 5%) */
export interface RepCommissionConfig {
  totalMaxPercent: number;   // загальний ліміт (default 0.10)
  personalPercent: number;   // особисте замовлення / representative (default 0.05)
  managerPercent: number;    // перша лінія / manager (default 0.03)
  directorPercent: number;   // друга лінія / director (default 0.02)
}

/** Значення за замовчуванням (захардкоджені як fallback) */
export const DEFAULT_REP_CONFIG: RepCommissionConfig = {
  totalMaxPercent: 0.10,
  personalPercent: 0.05,
  managerPercent: 0.03,
  directorPercent: 0.02,
};

/** Максимальний сумарний відсоток представників (legacy, використовується як fallback) */
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
 * Визначає відсотки для кожної ролі залежно від комбінації в ланцюгу.
 * Використовує конфігуровані відсотки замість захардкоджених.
 */
function resolvePercents(
  chain: RepresentativeChainNode[],
  cfg: RepCommissionConfig,
): Map<string, number> {
  const hasRep = chain.some(n => n.role === 'representative');
  const hasManager = chain.some(n => n.role === 'manager');
  const hasDirector = chain.some(n => n.role === 'director');

  const percents = new Map<string, number>();

  if (hasRep && hasManager && hasDirector) {
    // E) rep + manager + director
    percents.set('representative', cfg.personalPercent);
    percents.set('manager', cfg.managerPercent);
    percents.set('director', cfg.directorPercent);
  } else if (hasRep && hasManager) {
    // B) rep + manager
    percents.set('representative', cfg.personalPercent);
    percents.set('manager', cfg.managerPercent);
  } else if (hasManager && hasDirector) {
    // F) manager + director (manager gets personal, director gets director share)
    percents.set('manager', cfg.personalPercent);
    percents.set('director', cfg.directorPercent);
  } else if (hasRep) {
    // A) тільки rep
    percents.set('representative', cfg.personalPercent);
  } else if (hasManager) {
    // C) тільки manager (gets personal — особисте замовлення)
    percents.set('manager', cfg.personalPercent);
  } else if (hasDirector) {
    // D) тільки director (gets personal — особисте замовлення)
    percents.set('director', cfg.personalPercent);
  }

  return percents;
}

// ─── Обчислення ──────────────────────────────────────────────────────────────

/**
 * Розрахунок відрахувань представників від net_profit.
 *
 * @param netProfit      Чистий прибуток замовлення (order_amount - expenses)
 * @param chain          Ланцюг представників (representative → manager → director)
 * @param config         Конфігурація відсотків (опціонально, за замовчуванням DEFAULT_REP_CONFIG)
 */
export function calcRepresentativePool(
  netProfit: number,
  chain: RepresentativeChainNode[],
  config: RepCommissionConfig = DEFAULT_REP_CONFIG,
): RepresentativePoolResult {
  if (netProfit <= 0 || chain.length === 0) {
    return {
      totalPercent: 0,
      totalAmount: 0,
      netProfitAfterReps: netProfit,
      deductions: [],
    };
  }

  const percents = resolvePercents(chain, config);
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
    totalPercent: Math.min(totalPercent, config.totalMaxPercent),
    totalAmount: Math.min(totalAmount, netProfit * config.totalMaxPercent),
    netProfitAfterReps: Math.max(0, netProfit - Math.min(totalAmount, netProfit * config.totalMaxPercent)),
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
 */
export function calcFullDistributionWithReps(
  orderAmount: number,
  expenses: number,
  shareholders: ShareholderInput[],
  totalShares: number,
  repChain: RepresentativeChainNode[],
  unallocatedFunds: number = 0,
  repConfig: RepCommissionConfig = DEFAULT_REP_CONFIG,
): FullDistributionWithReps {
  // STEP 1: Cover expenses from unallocated_funds
  const coveredFromFund = Math.min(unallocatedFunds, expenses);
  const remainingExpenses = expenses - coveredFromFund;
  let fundBalance = unallocatedFunds - coveredFromFund;

  // STEP 2: Net profit with adjusted expenses
  const originalNetProfit = Math.max(0, orderAmount - remainingExpenses);

  // STEP 3: Representative pool
  const repPool = calcRepresentativePool(originalNetProfit, repChain, repConfig);

  // STEP 4: Shareholder distribution (UNCHANGED formula)
  const adjustedOrderAmount = repPool.netProfitAfterReps + remainingExpenses;
  const shareholderDist = calcFullProfitDistribution(adjustedOrderAmount, remainingExpenses, shareholders, totalShares);

  // STEP 5: unclaimed title bonuses → unallocated_funds
  fundBalance += shareholderDist.unclaimedTitleBonus;

  return {
    ...shareholderDist,
    representativePool: repPool,
    originalNetProfit,
    coveredFromFund,
    remainingExpenses,
    unallocatedFundsAfter: fundBalance,
  };
}
