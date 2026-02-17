

# Fix: Messages Not Appearing in Real-Time

## Problem

When two users are chatting on the Messages page, new messages don't appear automatically. The red badge on the "Повідомлення" nav button updates (proving Supabase Realtime works), but the chat area doesn't show the new message until the user clicks the nav button.

## Root Cause

There are TWO separate Supabase Realtime subscriptions with the **exact same filter** (`receiver_id=eq.${userId}` on the `messages` table):

1. **`useUnreadMessages` hook** (Navbar) -- works correctly, updates the badge
2. **Messages.tsx `recvChannel`** -- does NOT receive events

When two channels subscribe to the same table with the same filter, Supabase Realtime delivers events to only one of them (the first one created). Since `useUnreadMessages` is mounted in the Navbar (which renders before the Messages page content), it "claims" the subscription, and the Messages page's channel never fires.

## Solution

Remove the duplicate subscription from Messages.tsx entirely. Instead, have `useUnreadMessages` broadcast a custom event when new messages arrive, and have Messages.tsx listen for that event.

```text
Before (broken):
  useUnreadMessages: channel "unread-xxx" -> receiver_id filter -> updates badge (works)
  Messages.tsx:      channel "msg-recv-xxx" -> receiver_id filter -> updates chat (broken - duplicate)

After (fixed):
  useUnreadMessages: channel "unread-xxx" -> receiver_id filter -> updates badge + dispatches event
  Messages.tsx:      listens for custom event -> reloads active chat + chat list
```

## Changes

### 1. `src/hooks/useUnreadMessages.ts`

Add a custom event dispatch inside the realtime handler so other components can react:

- When the realtime handler fires (new message received), dispatch a `new-message-received` window event
- This event carries no data -- it's just a signal to re-fetch

### 2. `src/pages/Messages.tsx`

- **Remove** the `recvChannel` (the channel subscribing to `receiver_id=eq.${uid}`) -- this is the duplicate causing the conflict
- **Keep** the `sendChannel` (subscribing to `sender_id=eq.${uid}`) -- this is unique, for cross-tab sync only
- **Add** a `useEffect` that listens for the `new-message-received` custom event and calls `reloadActiveChat()` + `reloadChatList()`, plays notification sound, and marks messages as read if the active chat matches

### 3. No other files need changes

The `sendChannel` for cross-tab sync remains unchanged. The `useUnreadMessages` hook keeps working exactly as before, just with one extra line to dispatch an event.

## Technical Details

| File | Change |
|------|--------|
| `src/hooks/useUnreadMessages.ts` | Add `window.dispatchEvent(new CustomEvent('new-message-received'))` in realtime handler |
| `src/pages/Messages.tsx` | Remove `recvChannel`, add listener for `new-message-received` event |

## Why This Works

- Only ONE Supabase Realtime subscription exists for `receiver_id` filter on the `messages` table
- That subscription (in `useUnreadMessages`) already works reliably
- Messages.tsx receives the signal via a simple browser custom event -- no Supabase involved
- The `sendChannel` still works because `sender_id` is a different filter, no conflict

## Expected Results

- Messages appear instantly in the chat window when both users are on the Messages page
- The red badge on the nav button continues to work
- Notification sound plays for new messages
- Messages are automatically marked as read when chat is open

