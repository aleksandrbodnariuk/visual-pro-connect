# Security audit status

Last reviewed: 2026-10-06

## Database function access

- All 148 `SECURITY DEFINER` functions have a fixed function configuration; none are missing `search_path` protection.
- Anonymous execution was reduced from 23 functions to 6 intentionally public read functions:
  - `get_detailed_profile`
  - `get_minimal_public_profiles`
  - `get_safe_public_profiles`
  - `get_safe_public_profiles_by_ids`
  - `get_specialists`
  - `search_marketplace_listings`
- Role, admin, membership, order, stock-market, phone-existence, and last-seen checks require an authenticated session.
- The unused full-profile lookup by phone, `get_user_by_phone`, is service-role only.
- Authenticated execution remains on 90 functions because they are invoked by the client or by RLS policies. Mutating functions were reviewed for caller, owner, or admin checks.

## Remaining Supabase linter warnings

- 6 anonymous `SECURITY DEFINER` warnings are intentional public-directory and marketplace reads.
- 90 authenticated `SECURITY DEFINER` warnings are expected for client RPC and RLS helper functions; each function must keep internal authorization checks where it reads private data or mutates state.
- Leaked-password protection must be enabled in the Supabase Authentication settings.
- The available Postgres security update must be scheduled in the Supabase infrastructure settings.

## Ongoing rule

Every new `SECURITY DEFINER` function must pin `search_path`, revoke `PUBLIC` by default, grant only required roles, and enforce identity/role/ownership inside the function for sensitive reads or mutations.