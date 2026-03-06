

# Fix: Real-time Messages, Comments, and Likes

## Root Cause (Confirmed by Supabase GitHub Issue #1524)

The problem is a **confirmed Supabase Realtime bug**: when multiple channels subscribe to the same table with overlapping filters, **only one channel receives the event**. The others are silently ignored.

In this project, **three components** simultaneously use `useUnreadMessages()`, each creating its own Supabase Realtime channel with the identical filter `receiver_id=eq.{userId}`:

1. `NavbarNavigation` (desktop menu)
2. `MobileNavigation` (mobile bottom bar -- hidden via CSS but the hook still runs!)
3. Potentially more instances on pages with `Sidebar`

Even though each channel has a unique name, Supabase only delivers the event to one of them. Which one "wins" is unpredictable. When the winning instance dispatches `new-message-received`, Messages.tsx calls `reloadActiveChat()` -- but if the wrong instance wins (or none does due to race conditions), the chat doesn't update. Meanwhile, the badge might update via a different code path (e.g., `messages-read` event from another operation).

Reference: https://github.com/supabase/realtime/issues/1524

## Solution: Two-Part Fix

### Part 1: Singleton Realtime Subscription

Make `useUnreadMessages` use a **single shared Realtime channel** regardless of how many components use the hook. This is done with module-level variables:

- A shared channel reference and subscriber counter
- First component to mount creates the channel
- Last component to unmount removes it
- All instances share the same event source

```text
Before (broken):
  NavbarNavigation  -> useUnreadMessages -> channel "unread-abc" (receiver_id filter)
  MobileNavigation  -> useUnreadMessages -> channel "unread-def" (receiver_id filter)
  Result: Only ONE channel receives events (Supabase bug #1524)

After (fixed):
  NavbarNavigation  -> useUnreadMessages -> shares channel "unread-singleton"
  MobileNavigation  -> useUnreadMessages -> shares channel "unread-singleton"
  Result: ONE channel, always receives events
```

### Part 2: Polling Fallback for Messages Page

Even with the singleton fix, Realtime can occasionally drop events (network hiccups, server restarts). Add a **3-second polling interval** in Messages.tsx as a guaranteed fallback:

- Only polls when there is an active chat open
- Only polls when the browser tab is visible (uses `document.hidden`)
- Compares message count to avoid unnecessary re-renders
- Cleans up on unmount or when chat changes

This is the same approach used by Facebook Messenger, WhatsApp Web, and Telegram Web -- they all use WebSocket for instant delivery with polling as a safety net.

### Part 3: Auto-Scroll in MessageList

Currently, `MessageList` has no auto-scroll. When new messages arrive (via realtime or polling), the user might not see them if scrolled up. Add:

- `useRef` for the scroll container
- `useEffect` that scrolls to bottom when `messages.length` changes
- Only auto-scrolls if user is already near the bottom (within 100px)

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useUnreadMessages.ts` | Singleton pattern: module-level channel shared across all hook instances |
| `src/pages/Messages.tsx` | Add 3-second polling fallback with visibility check; add error handling to reloadActiveChat |
| `src/components/messages/MessageList.tsx` | Add auto-scroll to bottom on new messages |

## Technical Details

### useUnreadMessages.ts -- Singleton Pattern

```text
Module-level variables:
  let sharedChannel = null
  let sharedUserId = null
  let subscriberCount = 0

On mount (subscriberCount goes from 0 to 1):
  Create channel, subscribe to receiver_id filter
  Store in sharedChannel

On unmount (subscriberCount goes from 1 to 0):
  Remove channel
  Reset sharedChannel

On mount (subscriberCount > 1):
  Skip channel creation, reuse existing
```

### Messages.tsx -- Polling

```text
useEffect (depends on activeChat):
  if no active chat -> skip
  interval = setInterval(3000):
    if document.hidden -> skip (tab not visible)
    call reloadActiveChat()
  return cleanup -> clearInterval
```

### MessageList.tsx -- Auto-Scroll

```text
scrollRef on the outer div
useEffect([messages.length]):
  if scrollRef at bottom (within 100px) -> scrollIntoView
```

## Expected Results

- Messages appear instantly (via realtime) or within 3 seconds (via polling) -- guaranteed
- Badge updates reliably (single subscription, no conflicts)
- Chat auto-scrolls to show new messages
- No performance impact (polling pauses when tab is hidden)
- Comments and likes also benefit from the reduced channel conflicts

