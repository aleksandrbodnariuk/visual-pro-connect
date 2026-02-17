

# Plan: Fix Realtime for Messages, Posts, Comments, and Likes

## Root Cause

The core issue has two parts:

**1. Messages page: Two `postgres_changes` subscriptions on the same channel conflict**

In `Messages.tsx`, both `receiver_id` and `sender_id` filters are registered on the **same** Supabase Realtime channel. This is a known limitation -- when two `postgres_changes` listeners for the **same table** exist on one channel, they can interfere, causing events to be silently dropped. Meanwhile, `useUnreadMessages` (the badge) works because it uses a **single** filter on its own dedicated channel.

**2. NewsFeed/PostCard: Static channel names cause collisions**

The `NewsFeed` component uses the static channel name `realtime_posts_feed`. If multiple tabs or re-renders create a channel with the same name, the old subscription is silently replaced. The same applies to `post_likes_${postId}` and `realtime_comments_${id}` in PostCard -- they lack unique instance identifiers.

## Solution

Follow the same pattern that **already works** in `useUnreadMessages`:
- One filter per channel
- Unique channel names per component instance
- Simple re-fetch on any event (no payload inspection)

## Changes

### 1. `src/pages/Messages.tsx` -- Split into two separate channels

**Current (broken):**
One channel with two `.on()` calls for the same table.

**Fixed:**
Two separate channels, each with one filter. Simplified handler that always re-fetches without inspecting the payload.

```text
Before:
  channel "messages-page-xxx"
    .on(receiver_id filter)
    .on(sender_id filter)

After:
  channel "msg-recv-xxx"
    .on(receiver_id filter) -> always reload
  channel "msg-send-xxx"
    .on(sender_id filter)   -> always reload
```

The handler becomes trivial:
- On receiver_id events: reload active chat, reload chat list, play sound if new message for non-active chat
- On sender_id events: reload active chat (handles other-tab sends)

### 2. `src/components/feed/NewsFeed.tsx` -- Unique channel name

Change from static `'realtime_posts_feed'` to unique per-instance: `'realtime_posts_feed_' + Math.random()...`

This prevents channel collision across tabs or re-renders.

### 3. `src/components/feed/PostCard.tsx` -- Unique channel names for comments

Change `realtime_comments_${id}` to include a random suffix to prevent collisions across multiple views of the same post.

### 4. `src/hooks/usePostLikes.ts` -- Unique channel name

Change `post_likes_${postId}` to include a random suffix.

### 5. `src/hooks/useCommentLikes.ts` -- Unique channel name

Change `realtime_comment_likes_${commentId}` to include a random suffix.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Messages.tsx` | Split realtime into 2 channels, simplify handler |
| `src/components/feed/NewsFeed.tsx` | Unique channel name |
| `src/components/feed/PostCard.tsx` | Unique channel name for comments |
| `src/hooks/usePostLikes.ts` | Unique channel name |
| `src/hooks/useCommentLikes.ts` | Unique channel name |

## Technical Details

**Why splitting channels fixes messages:**

Supabase Realtime multiplexes subscriptions over a single WebSocket, but each `channel` maps to a separate Phoenix channel on the server. When two `postgres_changes` listeners for the same table are on one channel, the server sends events through a single path, and the client-side routing can fail to match the correct filter callback. By putting each filter on its own channel, each gets its own server-side subscription with unambiguous routing.

**Why unique names fix posts/likes/comments:**

Supabase's `channel()` method reuses existing channels with the same name. If a component unmounts and remounts (e.g., navigation), the old channel may still exist briefly, and the new `channel()` call returns a reference to the stale one. Adding a random suffix ensures each mount gets a fresh channel.

## Expected Results

- Messages appear instantly in the active chat window without clicking any buttons
- New posts appear in the feed across all tabs/users without page reload
- Likes count updates in realtime when another user reacts
- Comments appear in realtime under posts
- Comment reactions update in realtime

