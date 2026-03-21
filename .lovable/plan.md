

## Plan: Fix ProfitPreviewBlock — Add Representatives Section & Unallocated Funds Flow

### Issues Found

**Issue 1: No "Представники" section in preview**
`ProfitPreviewBlock` doesn't know the order's `representative_id`. It uses `calcFullProfitDistribution` (shareholder-only) instead of `calcFullDistributionWithReps` (which includes representatives). The `SpecialistOrder` TypeScript interface also lacks `representative_id`.

**Issue 2: "Не засвоєні" not shown flowing to unallocated_funds**
The preview uses `calcFullProfitDistribution` which doesn't model the `unallocated_funds` flow. `calcFullDistributionWithReps` already handles this — it covers expenses from fund and adds unclaimed bonuses back.

### Root Cause
Both issues stem from the same gap: `ProfitPreviewBlock` doesn't use `calcFullDistributionWithReps` and doesn't receive the order's `representative_id`.

### Changes

#### 1. `src/components/specialist/types.ts`
Add `representative_id: string | null` to `SpecialistOrder` interface.

#### 2. `src/components/specialist/ProfitPreviewBlock.tsx`
- Accept new prop: `representativeId: string | null`
- Load `unallocated_funds` from `company_settings`
- When `representativeId` exists, load the rep chain from `representatives` table (rep → parent → grandparent)
- Switch from `calcFullProfitDistribution` to `calcFullDistributionWithReps`
- Add a "Представники" section showing each chain node with role, percent, amount
- Show "Не засвоєні → фонд витрат" flow under title bonuses (unclaimed → unallocated_funds)
- Show expenses coverage from fund if applicable

#### 3. `src/components/specialist/OrderDetailsModal.tsx`
- Pass `order.representative_id` to `ProfitPreviewBlock` as `representativeId` prop

#### 4. No database changes needed
The server-side `process_order_profit` already handles both correctly. This is purely a client-side preview fix.

### Safety
- No mutations — preview is read-only
- `calcFullDistributionWithReps` already exists and is tested
- Falls back gracefully when `representative_id` is null (no rep section shown)
- All existing calculations remain unchanged

### Files to Change
- `src/components/specialist/types.ts` — add field
- `src/components/specialist/ProfitPreviewBlock.tsx` — main fix
- `src/components/specialist/OrderDetailsModal.tsx` — pass prop

