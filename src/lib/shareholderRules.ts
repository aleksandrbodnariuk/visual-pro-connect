/**
 * Централізований модуль бізнес-правил системи акціонерів.
 * Єдине джерело правди для титулів, порогів, відсотків розподілу прибутку.
 *
 * ВАЖЛИВО:
 * - Акція НЕ дає права на апаратуру чи майно.
 * - Акція дає право лише на відсоток з чистого прибутку.
 * - Чистий прибуток = сума замовлення − витрати.
 */

// ─── Розподіл чистого прибутку ───────────────────────────────────────────────

/** 50 % — між фахівцями, які працювали на замовленні */
export const PROFIT_SHARE_SPECIALISTS = 0.5;

/** 20 % — розподіляється на всі акції пропорційно */
export const PROFIT_SHARE_ALL_SHARES = 0.2;

/** 17.5 % — титульні бонуси (7 рівнів × 2.5 %) */
export const PROFIT_SHARE_TITLE_BONUSES = 0.175;

/** 12.5 % — адмін / реклама / домен / сайт / ремонт / інші витрати */
export const PROFIT_SHARE_ADMIN_FUND = 0.125;

/** Перевірка: сума повинна дорівнювати 1 */
const _sum =
  PROFIT_SHARE_SPECIALISTS +
  PROFIT_SHARE_ALL_SHARES +
  PROFIT_SHARE_TITLE_BONUSES +
  PROFIT_SHARE_ADMIN_FUND;

if (Math.abs(_sum - 1) > 0.0001) {
  console.error(
    `[shareholderRules] Сума розподілу прибутку ≠ 100 %: ${(_sum * 100).toFixed(2)} %`,
  );
}

// ─── Титули ──────────────────────────────────────────────────────────────────

export interface TitleThreshold {
  /** Мінімальний відсоток акцій (включно) */
  minPercent: number;
  /** Назва титулу українською */
  title: string;
  /** Рівень титулу (0 = найнижчий). Використовується для титульних бонусів. */
  level: number;
}

/**
 * Відсортовані від найвищого до найнижчого рівня.
 * `level` визначає, на скільки рівнів титульних бонусів має право акціонер.
 *
 * ВАЖЛИВО: мінімальний поріг — 1 %.
 * Користувач із 0 акцій (або 0 %) НЕ отримує жодного титулу.
 */
export const TITLE_THRESHOLDS: readonly TitleThreshold[] = [
  { minPercent: 100, maxPercent: 100, title: 'Імператор', level: 7 },
  { minPercent: 50,  maxPercent: 99,  title: 'Герцог',    level: 6 },
  { minPercent: 40,  maxPercent: 49,  title: 'Лорд',      level: 5 },
  { minPercent: 30,  maxPercent: 39,  title: 'Маркіз',    level: 4 },
  { minPercent: 20,  maxPercent: 29,  title: 'Граф',      level: 3 },
  { minPercent: 10,  maxPercent: 19,  title: 'Барон',     level: 2 },
  { minPercent: 5,   maxPercent: 9,   title: 'Магнат',    level: 1 },
  { minPercent: 1,   maxPercent: 4,   title: 'Акціонер',  level: 0 },
] as const;

// ─── Титульні бонуси ─────────────────────────────────────────────────────────

/**
 * Кожен рівень отримує 2.5 % чистого прибутку, розподілених на всі акції
 * акціонерів цього рівня і вище.
 *
 * Рівні (від нижчого до вищого):
 * 1 — Магнат і вище (≥5 %)
 * 2 — Барон і вище  (≥10 %)
 * 3 — Граф і вище   (≥20 %)
 * 4 — Маркіз і вище (≥30 %)
 * 5 — Лорд і вище   (≥40 %)
 * 6 — Герцог і вище  (≥50 %)
 * 7 — Імператор      (100 %)
 */
export const TITLE_BONUS_PERCENT_PER_LEVEL = 0.025; // 2.5 %
export const TITLE_BONUS_LEVELS_COUNT = 7;

export interface TitleBonusLevel {
  /** Номер рівня бонусу (1–7) */
  bonusLevel: number;
  /** Мінімальний рівень титулу, щоб брати участь у цьому бонусі */
  minTitleLevel: number;
  /** Опис */
  label: string;
}

export const TITLE_BONUS_LEVELS: readonly TitleBonusLevel[] = [
  { bonusLevel: 1, minTitleLevel: 1, label: 'Магнат і вище' },
  { bonusLevel: 2, minTitleLevel: 2, label: 'Барон і вище' },
  { bonusLevel: 3, minTitleLevel: 3, label: 'Граф і вище' },
  { bonusLevel: 4, minTitleLevel: 4, label: 'Маркіз і вище' },
  { bonusLevel: 5, minTitleLevel: 5, label: 'Лорд і вище' },
  { bonusLevel: 6, minTitleLevel: 6, label: 'Герцог і вище' },
  { bonusLevel: 7, minTitleLevel: 7, label: 'Імператор' },
] as const;

// ─── Допоміжне ───────────────────────────────────────────────────────────────

/**
 * Визначити титул за відсотком акцій.
 *
 * Повертає `null` якщо:
 * - percent <= 0 (0 акцій або система ще не налаштована)
 * - totalShares = 0
 *
 * Це НОРМАЛЬНИЙ стан системи на початку роботи, а не помилка.
 */
export function getTitleByPercent(percent: number): TitleThreshold | null {
  // Жодного титулу при 0 акцій або ненастроєній системі
  if (percent <= 0) return null;

  const rounded = Math.floor(percent * 100) / 100; // уникнути floating-point
  for (const t of TITLE_THRESHOLDS) {
    if (rounded >= t.minPercent && rounded <= t.maxPercent) return t;
  }
  // Якщо < 1 % (наприклад, 0.5 %) — теж без титулу, бо мінімум 1 %
  return null;
}

/**
 * Текстова назва титулу або порожній рядок, якщо титулу немає.
 * Зручний helper для UI, щоб не перевіряти null скрізь.
 */
export function getTitleName(percent: number): string {
  return getTitleByPercent(percent)?.title ?? '';
}
