

# Security Fix: RLS Policies for `users` Table

## Problem Analysis

Current dangerous policies:

1. **UPDATE policy** `"Users can manage their own profile"` — allows `WHERE id = auth.uid() OR check_admin_access()`. A regular user can call `.from('users').update({ is_admin: true }).eq('id', auth.uid())` and escalate privileges.

2. **INSERT policy** `"Users can insert their own profile"` — allows `auth.uid() IS NULL` (anonymous inserts). While the `handle_new_user` trigger is the intended path, nothing prevents a crafted anon request from inserting `is_admin: true`.

## What regular users legitimately update on `users`

From the codebase scan:
- `full_name`, `phone_number` (AccountSettings)
- `country`, `city`, `categories` (ProfileEditor)
- `avatar_url` (AvatarUpload, ProfileEditor)
- `banner_url` (BannerUpload)
- `theme` (ThemeSettings)
- `last_seen` (useVisitTracker)
- `bio`, `website`, `instagram`, `facebook`, `viber` (ProfileEditor via onSave callback)

## What admins update via direct table access

From UsersTab:
- `is_shareholder` (toggleShareholderStatus)
- `is_admin`, `is_shareholder` (changeUserRole)
- `is_blocked` (toggleBlockUser)
- `delete` (executeDelete)

These already pass through `check_admin_access()` in the existing UPDATE policy — that part is fine.

## Plan

### 1. Create a BEFORE UPDATE trigger on `users` that strips privileged fields for non-admins

Instead of changing the RLS policy (which would break admin flows), add a `BEFORE UPDATE` trigger that resets privileged columns to their OLD values when the caller is not an admin:

```sql
CREATE OR REPLACE FUNCTION protect_user_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If caller is admin, allow all changes
  IF public.is_user_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Non-admin: force privileged fields back to old values
  NEW.is_admin := OLD.is_admin;
  NEW.founder_admin := OLD.founder_admin;
  NEW.is_blocked := OLD.is_blocked;
  NEW.is_shareholder := OLD.is_shareholder;
  NEW.title := OLD.title;  -- auto-managed by title sync

  RETURN NEW;
END;
$$;
```

### 2. Tighten the INSERT policy

Replace the current INSERT policy that allows `auth.uid() IS NULL` with two separate policies:
- One for the auth trigger context (service role handles `handle_new_user`)
- One for authenticated users inserting only their own profile

The trigger `handle_new_user` runs as `SECURITY DEFINER` so it bypasses RLS. The `auth.uid() IS NULL` clause in the INSERT policy is therefore unnecessary and dangerous.

New INSERT policy:
```sql
-- Only allow authenticated users to insert their own profile  
-- (handle_new_user trigger uses SECURITY DEFINER, bypasses RLS)
WITH CHECK ((id = auth.uid()) OR check_admin_access())
```

Also add a BEFORE INSERT trigger to strip privileged fields for non-admins (same pattern).

### 3. No frontend changes needed

All admin operations already check `check_admin_access()` in code before calling `.update()`. The trigger is a defense-in-depth layer — it won't break any existing flow since admins pass through and regular users never legitimately set these fields.

### Summary of changes

| Change | Type |
|---|---|
| New function `protect_user_privileged_fields()` | DB migration |
| New BEFORE UPDATE trigger on `users` | DB migration |
| New BEFORE INSERT trigger on `users` (strip privileged fields) | DB migration |
| Drop + recreate INSERT policy (remove anon access) | DB migration |

**No frontend files changed. No existing functionality broken.**

### Verification

- Regular user updates name/avatar/bio → works (safe fields pass through)
- Regular user tries `update({ is_admin: true })` → trigger silently resets to old value
- Anonymous INSERT → blocked by new policy
- Admin changes `is_blocked`, `is_shareholder`, `is_admin` → works (trigger allows admins)
- `handle_new_user` auth trigger → works (SECURITY DEFINER bypasses RLS)

