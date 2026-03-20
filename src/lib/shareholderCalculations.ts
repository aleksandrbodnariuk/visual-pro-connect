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

// ─── Конфігурація розподілу ───────────────────────────────────────────────────

/** Налаштовувані відсотки розподілу прибутку */
export interface ShareholderDistConfig {
  specialistsPercent: number; // 0..1
  sharesPercent: number;      // 0..1
  titleBonusPercent: number;  // 0..1
  adminFundPercent: number;   // 0..1
}

/** Значення за замовчуванням (збігаються з хардкодом) */
export const DEFAULT_DIST_CONFIG: ShareholderDistConfig = {
  specialistsPercent: PROFIT_SHARE_SPECIALISTS,
  sharesPercent: PROFIT_SHARE_ALL_SHARES,
  titleBonusPercent: PROFIT_SHARE_TITLE_BONUSES,
  adminFundPercent: PROFIT_SHARE_ADMIN_FUND,
};

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
  /** Базовий дохід з пулу акціонерів (пропорційно до кількості акцій) */
  baseIncome: number;
  /** Сума титульних бонусів */
  titleBonus: number;
  /** Загальний прогнозований дохід (base + titleBonus) */
  totalIncome: number;
}

export interface ProfitDistribution {
  /** Чистий прибуток */
  netProfit: number;
  /** Фахівцям */
  specialistsPool: number;
  /** На всі акції */
  sharesPool: number;
  /** Титульні бонуси */
  titleBonusPool: number;
  /** Адмін-фонд */
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
export function calcProfitPools(netProfit: number, config?: ShareholderDistConfig) {
  const cfg = config ?? DEFAULT_DIST_CONFIG;
  return {
    specialistsPool: netProfit * cfg.specialistsPercent,
    sharesPool: netProfit * cfg.sharesPercent,
    titleBonusPool: netProfit * cfg.titleBonusPercent,
    adminFund: netProfit * cfg.adminFundPercent,
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
      unclaimedTitleBonus: pools.titleBonusPool,
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

  // Підрахунок не засвоєних титульних бонусів
  const totalDistributedTitleBonus = results.reduce((sum, r) => sum + r.titleBonus, 0);
  const unclaimedTitleBonus = Math.max(0, pools.titleBonusPool - totalDistributedTitleBonus);

  return {
    netProfit,
    ...pools,
    unclaimedTitleBonus,
    shareholders: results,
  };
}
