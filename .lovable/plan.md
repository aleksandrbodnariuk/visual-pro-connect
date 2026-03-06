

## Diagnosis: PWA App Badge Not Appearing

### Root Cause

After analyzing the full flow, I identified **3 issues** causing the badge to not work:

### Issue 1: Realtime Subscription Silently Fails
The `useUnreadMessages` singleton channel calls `.subscribe()` without a status callback. If Realtime fails to connect (network issues, token expiry), no error is raised and no events are ever received. There is **no fallback polling** to catch missed events.

### Issue 2: `useBadgeClear` Overwrites Badge on App Open
When the user opens the app after receiving a push notification, `useBadgeClear` immediately runs `syncBadgeWithRealCount()` which queries Supabase for unread counts. If this query executes **before** the auth session is fully established, it may return 0 (RLS blocks unauthenticated queries on `messages`), resetting the badge the SW just set.

### Issue 3: No Retry/Reconnect for Realtime Channel
If the Realtime WebSocket disconnects (common on mobile when the app goes to background), the singleton channel is never recreated. The `subscriberCount` and `sharedChannel` state become stale.

---

### Plan

**1. Add Realtime subscription error handling and reconnection**
In `useUnreadMessages.ts`:
- Add a `.subscribe((status, err) => { ... })` callback to log errors
- On `CHANNEL_ERROR` or `TIMED_OUT`, destroy and recreate the channel after a delay
- Add a visibility-change listener: when the app becomes visible, verify the channel is still `joined` and reconnect if not

**2. Add fallback polling in `useUnreadMessages`**
- Add a 30-second interval poll (like Messages page already does) as a safety net
- Only poll when `document.visibilityState === 'visible'`
- This ensures the badge updates even if Realtime is broken

**3. Fix `useBadgeClear` timing**
- Add a guard: only run `syncBadgeWithRealCount` if `user` is available AND the Supabase session is confirmed
- Add a small delay (500ms) on initial load to let auth settle before querying
- On visibility change, don't clear immediately — fetch the real count first (already done), but ensure auth is ready

**4. Add debug logging**
- Add `console.log('[Unread]')` traces in the Realtime callback, fetch, and badge update functions so future issues are diagnosable

### Files to Modify
- `src/hooks/useUnreadMessages.ts` — reconnection logic, fallback polling, debug logs
- `src/hooks/useBadgeClear.ts` — auth timing guard

