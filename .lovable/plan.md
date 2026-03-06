

## Analysis: Blank Page on Navigation to Messages and Admin

### Root Cause

There are **two interrelated issues** causing blank pages during SPA navigation:

---

### Issue 1: Race Condition in Admin.tsx Auth Check

In `Admin.tsx`, the `useEffect` (line 63-125) runs this logic:

```
if (loading) return;                         // ← OK, waits
if (!isAuthenticated() || !currentUser) {     // ← BUG HERE
    navigate("/auth");                        // redirects away!
}
```

The render guard on line 132 correctly handles the case where session exists but `appUser` hasn't loaded yet:
```tsx
if (isAuthenticated() && !currentUser) {
    return <div>Завантаження даних користувача...</div>;
}
```

**But** the `useEffect` runs AFTER render and does NOT have this same guard. When `loading` becomes `false` but `appUser` is still `null` (brief window), the effect fires, sees `!currentUser` is true, and **redirects to `/auth`**. This redirect happens before React re-renders with the updated `appUser`.

Additionally, `isAuthenticated` (a function reference) and `currentUser` (an object) in the dependency array cause the effect to re-fire on every auth state change, compounding the race.

### Issue 2: No Error Boundary for Lazy-Loaded Routes

All page components are lazy-loaded via `React.lazy()` with a single `Suspense` wrapper. If any component throws during render (e.g., from the auth race condition above), React unmounts the entire tree with **no fallback** -- resulting in a blank white page. A page reload works because the auth state is fully resolved before the component mounts.

### Issue 3: Messages Page Redundant Auth Check

`Messages.tsx` calls `supabase.auth.getSession()` directly instead of using `useAuth()` context. This creates a second, independent auth check that can race with the context. If `getSession()` returns slower than expected during SPA navigation, `isLoading` stays `true` indefinitely, or the page redirects to `/auth`.

---

### Plan

#### 1. Fix Admin.tsx useEffect race condition
- Add an early return when `isAuthenticated() && !currentUser` (appUser still loading) -- matching the render guard
- Remove `currentUser` and `isAuthenticated` from the useEffect dependency array (they shouldn't trigger data reloading, only `loading` and `tabName` should)
- Keep auth checks only in the render path, not in effects

#### 2. Add React Error Boundary
- Create a simple `ErrorBoundary` component in `src/components/ui/ErrorBoundary.tsx`
- Wrap the `Suspense` in `App.tsx` with this boundary so lazy-load or render failures show a fallback UI with a retry button instead of a blank page

#### 3. Fix Messages.tsx auth flow
- Replace the direct `supabase.auth.getSession()` call with `useAuth()` context data
- Use `user` from context (already available) instead of making a separate async call
- This eliminates the race condition and makes the page render immediately with the existing auth state

#### 4. Files to modify
- `src/pages/Admin.tsx` -- fix useEffect deps and add appUser loading guard
- `src/pages/Messages.tsx` -- use useAuth() instead of direct getSession()
- `src/components/ui/ErrorBoundary.tsx` -- new file
- `src/App.tsx` -- wrap Suspense with ErrorBoundary

