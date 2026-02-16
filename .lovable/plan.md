

# Plan: Fix Realtime for Messages, Posts, Comments, and Likes

## Problem Summary

There are multiple issues preventing real-time updates from working:

1. **Messages button not working when already on /messages**: The `messages-force-reload` event handler captures a stale `currentUser` (which is `null` at mount time) due to incorrect `useEffect` dependencies.

2. **Messages not appearing in real-time in active chat**: The realtime subscription and re-fetch logic has a subtle bug -- when `reloadChatList()` is called, it fetches all chats with `receiverId=null`, which may not properly preserve the active chat's message state. Also, the `messages-force-reload` handler never fires because of the stale closure issue.

3. **Posts not appearing in real-time**: The `NewsFeed` component has a correct subscription on the `posts` table (unfiltered), and `REPLICA IDENTITY FULL` is set. The subscription calls `loadPosts()` which should work. This needs verification -- it may be a production vs test environment issue (the migration may not have been published yet).

4. **Likes and comments not updating in real-time**: Same root cause -- filtered subscriptions on `post_likes` and `comments` tables by `post_id` require `REPLICA IDENTITY FULL`. The migration was applied in test but may not be published to production yet.

## Root Causes

1. **Stale closure in `messages-force-reload` handler** -- The `useEffect` at line 60 in `Messages.tsx` depends on `[navigate]` but uses `currentUser` which starts as `null`. When the handler fires, `currentUser?.id` is always `null`.

2. **Missing production deployment** -- The `REPLICA IDENTITY FULL` migration was applied to the test database but may not yet be published to the production (live) environment.

3. **Realtime subscription not handling chat list reload properly** -- When a new message arrives and the chat list is reloaded, the active chat state may become inconsistent because `reloadChatList` calls `fetchChatsAndMessages(userId, null)` which doesn't account for the currently active chat.

## Changes

### 1. Fix `Messages.tsx` -- Stale Closure and Realtime Logic

**Problem**: The `messages-force-reload` handler and the realtime subscription reference `currentUser` which is `null` initially. The `useEffect` that sets up the force-reload listener runs once at mount and never re-runs when `currentUser` changes.

**Fix**:
- Use a `currentUserRef` (similar to `activeChatRef`) to always have access to the latest `currentUser` value
- Add `currentUser?.id` to the dependency array of the force-reload `useEffect`
- Simplify the `reloadChatList` to properly update chats without disrupting the active chat
- Move the force-reload handler into the effect that has access to the correct user state

### 2. Fix `NavbarNavigation.tsx` -- Navigation to /messages

**Problem**: When clicking "Повідомлення" while already on `/messages`, the `e.preventDefault()` prevents navigation, and the custom event fires but is handled by a stale closure. Even when navigating from another page to `/messages`, clicking works because React Router performs navigation which re-mounts the component.

**Fix**: Instead of preventing default and dispatching an event, use `navigate('/messages')` with a force re-render approach, or fix the event handler in Messages.tsx to properly reference the current user.

### 3. Publish Migration to Production

The user needs to publish the latest changes to production so that `REPLICA IDENTITY FULL` takes effect on the live database. Without this, realtime filtered subscriptions will silently fail in production.

## Technical Details

### Messages.tsx Changes

```text
Key changes:
1. Add currentUserRef to track latest currentUser
2. Fix force-reload useEffect to depend on currentUser?.id
3. Use currentUserRef in the force-reload handler
4. Improve reloadChatList to not reset active chat state
```

Specific code changes in `src/pages/Messages.tsx`:

- Add `const currentUserRef = useRef<any>(null);` and keep it synced with `currentUser`
- In the `messages-force-reload` handler, use `currentUserRef.current?.id` instead of `currentUser?.id`
- Split the `initializeMessages` effect and the `force-reload` listener into separate effects
- The force-reload effect should depend on `[currentUser?.id]` so it re-subscribes with the correct closure

### NavbarNavigation.tsx Changes

No changes needed if the Messages.tsx fix resolves the stale closure issue. The custom event approach will work correctly once the handler has access to the right user.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Messages.tsx` | Fix stale closure for `currentUser`, improve realtime handling |

## Expected Results

- Messages appear instantly in the active chat without any button clicks or page reloads
- The "Повідомлення" navigation button works correctly when clicked while on /messages
- Posts appear in the news feed in real-time when other users publish them
- Likes and comments update in real-time across all users
- Message edits and deletes reflect immediately for the recipient

## Post-Implementation

After applying these code changes, the user should **publish to production** so the `REPLICA IDENTITY FULL` migration takes effect on the live site. Without publishing, the realtime features will only work in the preview/test environment.

