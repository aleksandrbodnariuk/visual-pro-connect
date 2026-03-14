/**
 * Модуль обчислень для системи акціонерів.
 * Чисті функції — не залежать від UI, Supabase чи конкретного компонента.
 */

import {
  PROFIT_SHARE_SPECIALISTS,
  PROFIT_SHARE_ALL_SHARES,
  PROFIT_SHARE_TITLE_BONUSES,
  PROFIT_SHARE_ADMIN_FUND,
  TITLE_BONUS_PERCENT_PER_LEVEL,
  TITLE_BONUS_LEVELS,
  getTitleByPercent,
  type TitleThreshold,
} from './shareholderRules';

// ─── Типи ────────────────────────────────────────────────────────────────────

export interface ShareholderInput {
  userId: string;
  shares: number;
}

export interface ShareholderProfitResult {
  userId: string;
  shares: number;
  percent: number;
  /** null якщо у акціонера 0 акцій або система ще не налаштована */
  title: TitleThreshold | null;
  /** Базовий дохід з 20 %-пулу (пропорційно до кількості акцій) */
  baseIncome: number;
  /** Сума титульних бонусів */
  titleBonus: number;
  /** Загальний прогнозований дохід (base + titleBonus) */
  totalIncome: number;
}

export interface ProfitDistribution {
  /** Чистий прибуток */
  netProfit: number;
  /** 50 % — фахівцям */
  specialistsPool: number;
  /** 20 % — на всі акції */
  sharesPool: number;
  /** 17.5 % — титульні бонуси */
  titleBonusPool: number;
  /** 12.5 % — адмін-фонд */
  adminFund: number;
  /** Сума титульних бонусів, які не розподілені (відсутні вищі титули) */
  unclaimedTitleBonus: number;
  /** Деталі по кожному акціонеру */
  shareholders: ShareholderProfitResult[];
}

// ─── Основні обчислення ──────────────────────────────────────────────────────

/** Чистий прибуток = сума замовлення − витрати */
export function calcNetProfit(orderAmount: number, expenses: number): number {
  return Math.max(0, orderAmount - expenses);
}

/** Розподіл чистого прибутку на 4 пули */
export function calcProfitPools(netProfit: number) {
  return {
    specialistsPool: netProfit * PROFIT_SHARE_SPECIALISTS,
    sharesPool: netProfit * PROFIT_SHARE_ALL_SHARES,
    titleBonusPool: netProfit * PROFIT_SHARE_TITLE_BONUSES,
    adminFund: netProfit * PROFIT_SHARE_ADMIN_FUND,
  };
}

/** Відсоток акцій конкретного акціонера. Повертає 0 якщо totalShares = 0. */
export function calcSharePercent(userShares: number, totalShares: number): number {
  if (totalShares <= 0 || userShares <= 0) return 0;
  return (userShares / totalShares) * 100;
}

/** Базовий дохід акціонера з 20 %-пулу */
export function calcBaseIncome(
  userShares: number,
  totalShares: number,
  sharesPool: number,
): number {
  if (totalShares <= 0 || userShares <= 0) return 0;
  return (userShares / totalShares) * sharesPool;
}

/**
 * Титульний бонус конкретного акціонера.
 *
 * Для кожного з 7 рівнів бонусу (2.5 % чистого прибутку кожен):
 *   — визначаємо загальну кількість акцій акціонерів, чий titleLevel ≥ minTitleLevel
 *   — якщо поточний акціонер проходить поріг, він отримує свою частку пропорційно
 *
 * Повертає 0, якщо title = null (0 акцій / ненастроєна система).
 */
export function calcTitleBonus(
  userShares: number,
  userTitleLevel: number | null,
  allShareholders: ShareholderInput[],
  totalShares: number,
  netProfit: number,
): number {
  if (userTitleLevel === null || totalShares <= 0 || netProfit <= 0 || userShares <= 0) return 0;

  let bonus = 0;

  for (const level of TITLE_BONUS_LEVELS) {
    if (userTitleLevel < level.minTitleLevel) continue;

    // Сума акцій усіх акціонерів, які проходять цей рівень
    const eligibleShares = allShareholders.reduce((sum, sh) => {
      const pct = calcSharePercent(sh.shares, totalShares);
      const t = getTitleByPercent(pct);
      if (t !== null && t.level >= level.minTitleLevel) return sum + sh.shares;
      return sum;
    }, 0);

    if (eligibleShares <= 0) continue;

    const levelPool = netProfit * TITLE_BONUS_PERCENT_PER_LEVEL;
    bonus += (userShares / eligibleShares) * levelPool;
  }

  return bonus;
}

// ─── Повний розрахунок ───────────────────────────────────────────────────────

/**
 * Повний розподіл прибутку від одного замовлення.
 *
 * @param orderAmount  Сума замовлення
 * @param expenses     Витрати
 * @param shareholders Список акціонерів з кількістю акцій
 * @param totalShares  Загальна кількість акцій у компанії (з company_settings)
 *
 * Якщо totalShares = 0, shareholders = [] або netProfit = 0 —
 * повертає нульові пули і порожній масив акціонерів.
 * Це нормальний стан системи до налаштування, а не помилка.
 */
export function calcFullProfitDistribution(
  orderAmount: number,
  expenses: number,
  shareholders: ShareholderInput[],
  totalShares: number,
): ProfitDistribution {
  const netProfit = calcNetProfit(orderAmount, expenses);
  const pools = calcProfitPools(netProfit);

  // Якщо система не налаштована — повертаємо порожній результат
  if (totalShares <= 0 || shareholders.length === 0) {
    return {
      netProfit,
      ...pools,
      shareholders: [],
    };
  }

  const results: ShareholderProfitResult[] = shareholders.map((sh) => {
    const percent = calcSharePercent(sh.shares, totalShares);
    const title = getTitleByPercent(percent);
    const baseIncome = calcBaseIncome(sh.shares, totalShares, pools.sharesPool);
    const titleBonus = calcTitleBonus(
      sh.shares,
      title?.level ?? null,
      shareholders,
      totalShares,
      netProfit,
    );

    return {
      userId: sh.userId,
      shares: sh.shares,
      percent,
      title,
      baseIncome,
      titleBonus,
      totalIncome: baseIncome + titleBonus,
    };
  });

  return {
    netProfit,
    ...pools,
    shareholders: results,
  };
}
