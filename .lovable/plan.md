

# Plan: Fix Intermittent Loading Freeze on Smartphones

## Root Cause

The app freezes on the loading spinner because **multiple independent auth initializations race against each other**, and **there is no timeout fallback** if any of them hang.

On every page load, these components each independently call Supabase auth:

1. **AuthContext** -- `getSession()` + `onAuthStateChange` listener
2. **useSupabaseAuth** (Navbar) -- another `getSession()` + `onAuthStateChange` + RPC call `get_my_profile`
3. **useSupabaseAuth** (MobileNavigation via useAuthState) -- yet another independent instance with its own `getSession()` + `onAuthStateChange` + `get_my_profile`
4. **useUnreadMessages** (MobileNavigation) -- another `getSession()` + `onAuthStateChange`
5. **useDataSync** -- `getUser()` + 3 more Supabase queries
6. **FaviconUpdater** -- another Supabase query
7. **ThemeSyncer** -- another Supabase query

That is **5+ simultaneous auth calls** and **4+ onAuthStateChange listeners** created on every page load. Each `useSupabaseAuth` instance also makes an RPC call (`get_my_profile`) to fetch the user profile.

On smartphones with slow or unstable connections, any of these can hang indefinitely. Since `AuthContext.loading` has no timeout, the spinner shows forever.

## Changes

### 1. Add auth timeout to `src/context/AuthContext.tsx`

Add a 10-second safety timeout so the loading state resolves even if Supabase is unreachable:

```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    if (loading) {
      console.warn('Auth timeout - proceeding without session');
      setLoading(false);
    }
  }, 10000);
  return () => clearTimeout(timeout);
}, [loading]);
```

### 2. Add loading timeout to `src/hooks/auth/useSupabaseAuth.ts`

Same 10-second timeout for the `loading` state in `useSupabaseAuth`, which blocks Navbar and MobileNavigation rendering:

```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    if (loading) {
      console.warn('useSupabaseAuth timeout - proceeding');
      setLoading(false);
    }
  }, 10000);
  return () => clearTimeout(timeout);
}, [loading]);
```

### 3. Protect `src/hooks/useDataSync.ts` with timeout

Wrap the sync queries in `fetchWithTimeout` (already exists in `src/lib/utils.ts`) so they don't block indefinitely:

```typescript
import { fetchWithTimeout } from '@/lib/utils';

// Each query wrapped with 10s timeout
const { data: friendRequests } = await fetchWithTimeout(
  supabase.from('friend_requests').select('*').or(...),
  10000
);
```

### 4. Protect `src/hooks/useUnreadMessages.ts` with timeout

Add a timeout to the `getSession()` call so it doesn't hang:

```typescript
const getUser = async () => {
  try {
    const { data: { session } } = await fetchWithTimeout(
      supabase.auth.getSession(),
      10000
    );
    // ...
  } catch {
    console.warn('Unread messages: session timeout');
  }
};
```

## Files to Modify (4 total)

| File | Change |
|------|--------|
| `src/context/AuthContext.tsx` | Add 10s loading timeout |
| `src/hooks/auth/useSupabaseAuth.ts` | Add 10s loading timeout |
| `src/hooks/useDataSync.ts` | Wrap queries with fetchWithTimeout |
| `src/hooks/useUnreadMessages.ts` | Wrap getSession with timeout |

## Expected Result

If Supabase is slow or unreachable on mobile, the app will stop showing the spinner after 10 seconds and display the page (either the Hero for unauthenticated users, or the feed). This prevents the "frozen" state entirely.

