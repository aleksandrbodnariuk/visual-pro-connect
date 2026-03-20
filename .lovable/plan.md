

## Plan: Configurable Shareholder Profit Distribution Percentages

### Feasibility Assessment

**Verdict: МОЖЛИВО виконати безпечно.** Архітектура вже побудована за тим самим паттерном, що й для представників. Ризики мінімальні, бо:
- Всі клієнтські розрахунки — read-only preview (не мутують дані)
- Серверна логіка (`process_order_profit`) — єдине місце мутацій, оновлюється атомарно
- Формула акціонерів ізольована від формули представників (представники вираховуються ДО розподілу)
- Сума 4 пулів завжди валідується на 100%

### Problem
The 50/20/17.5/12.5 profit distribution is hardcoded everywhere. Admin founder should be able to adjust these from the Shareholders tab.

### Changes

#### 1. Database: Seed 4 new `site_settings` keys
- `profit-specialists-percent` (default: `50`)
- `profit-shares-percent` (default: `20`)
- `profit-title-bonus-percent` (default: `17.5`)
- `profit-admin-fund-percent` (default: `12.5`)

#### 2. Database: Update `process_order_profit`
Replace hardcoded `0.50, 0.20, 0.175, 0.125` with values read from `site_settings` at execution time. Title bonus per level = `titleBonusPool / 7` (derived from the configurable pool).

#### 3. Client: Parameterize `shareholderCalculations.ts`
- Add `ShareholderDistConfig` interface with 4 pool percentages
- Make `calcProfitPools` and `calcFullProfitDistribution` accept optional config
- `calcTitleBonus` will use `titleBonusPercent / 7` instead of hardcoded `TITLE_BONUS_PERCENT_PER_LEVEL`
- Default values match current hardcoded constants (backward compatible)

#### 4. Admin UI: Add settings section in `ShareholdersTab.tsx`
Add a card with 4 inputs:
- Фахівці (%) — default 50
- Акціонери (%) — default 20
- Титульні бонуси (%) — default 17.5
- Адмін-фонд (%) — default 12.5

Validation: sum must equal 100%. Info text explaining title bonus recalculation (per level = total / 7).

#### 5. Update all call sites to load config
- `FinancialStatsTab.tsx` — load settings, pass to calculations
- `PayoutsTab.tsx` — load settings, pass to calculations
- `ProfitPreviewBlock.tsx` — load settings, pass to calculations
- `ShareholderProfitForecast.tsx` — load settings, pass to calculations

### What Stays Unchanged
- Representative commission system (completely independent)
- Title thresholds (1%/5%/10%/20%/30%/40%/50%/100%)
- Unallocated funds logic
- Representative hierarchy

### Files to Change
- `supabase/migrations/` — seed settings + update `process_order_profit`
- `src/lib/shareholderRules.ts` — keep constants as defaults, no breaking changes
- `src/lib/shareholderCalculations.ts` — add config parameter
- `src/components/admin/tabs/ShareholdersTab.tsx` — add settings UI
- `src/components/admin/tabs/FinancialStatsTab.tsx` — pass config
- `src/components/admin/tabs/PayoutsTab.tsx` — pass config
- `src/components/specialist/ProfitPreviewBlock.tsx` — pass config
- `src/components/profile/ShareholderProfitForecast.tsx` — pass config

