

## Plan: Configurable Representative Commission Percentages

### Problem
All representative commission percentages are hardcoded in both client-side (`representativeCalculations.ts`) and server-side (`process_order_profit` SQL function). The admin can only change a single "commission percent" field that isn't actually used in calculations.

### Changes

#### 1. Add 4 new site_settings keys (Database Migration)
Store configurable percentages in `site_settings`:
- `rep-total-max-percent` (default: `10`) — total pool cap
- `rep-personal-percent` (default: `5`) — personal order commission (representative level)
- `rep-manager-percent` (default: `3`) — first line (manager) commission
- `rep-director-percent` (default: `2`) — second line (director) commission

Seed these with current defaults. Remove the old `rep-commission-percent` key (or keep for backward compat).

#### 2. Update Admin Settings UI (`RepresentativesTab.tsx`)
Replace the single "Комісійний відсоток" input with 4 inputs:
- **Загальний відсоток представників (%)** — max pool, currently 10%
- **Особисте замовлення (%)** — representative's personal cut, currently 5%
- **Перша лінія / Менеджер (%)** — manager cut, currently 3%
- **Друга лінія / Директор (%)** — director cut, currently 2%

Add validation: personal + manager + director must not exceed total max. Show a warning/info about how combinations work (e.g., when only manager exists, they get personal + manager = 8%).

#### 3. Update Client-side Calculations (`representativeCalculations.ts`)
- Make `resolvePercents` accept configurable rates instead of hardcoded `0.05/0.03/0.02`
- Add a `RepCommissionConfig` interface with the 4 values
- Update `calcRepresentativePool` and `calcFullDistributionWithReps` to accept this config
- Update all call sites (ProfitPreviewBlock, FinancialStatsTab) to load settings from `site_settings` and pass them

#### 4. Update Server-side `process_order_profit` (Database Migration)
Modify the function to read percentages from `site_settings` at execution time instead of using hardcoded values. The logic for combinations remains the same (A-F cases), but uses the configured values:
- When only rep: uses `rep-personal-percent`
- When rep + manager: `rep-personal-percent` + `rep-manager-percent`
- When manager alone (no rep below): `rep-personal-percent` + `rep-manager-percent`
- When all three: `rep-personal-percent` + `rep-manager-percent` + `rep-director-percent`
- Total capped at `rep-total-max-percent`

#### 5. Validation Rules
- All values must be >= 0
- `personal + manager + director <= total max`
- Show real-time validation in the admin form before saving

### Files to Change
- `supabase/migrations/` — new migration to seed settings + update `process_order_profit`
- `src/components/admin/tabs/RepresentativesTab.tsx` — expanded settings form
- `src/lib/representativeCalculations.ts` — parameterized calculation functions
- `src/components/specialist/ProfitPreviewBlock.tsx` — load config from settings
- `src/components/admin/tabs/FinancialStatsTab.tsx` — load config from settings (if it uses rep calculations)

### What Stays Unchanged
- Shareholder profit distribution formula (50/20/17.5/12.5)
- Title bonus system
- Unallocated funds logic
- Representative hierarchy/promotion logic

