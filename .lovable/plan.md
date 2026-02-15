
# Plan: Fix Realtime Updates and Reaction Picker

## Problem Analysis

### 1. Reaction Picker Not Appearing
The ReactionPicker uses `onMouseEnter`/`onMouseLeave` on the container, but the picker is rendered via a portal at a fixed position. When the user moves the mouse from the button up to the picker, they leave the container div, which triggers `scheduleHide`. There's a gap between the container and the picker (the picker appears 46px above). The mouse passes through empty space where neither the container nor the picker receives hover events, causing the picker to disappear before the user reaches it.

**Fix**: Add an invisible "bridge" element between the container and the picker to maintain the hover zone. Also ensure the picker positioning accounts for the gap.

### 2. Realtime Not Working (Posts, Comments, Reactions)
The database migration to add tables to `supabase_realtime` publication was applied successfully -- all 5 tables (messages, posts, comments, comment_likes, post_likes) are confirmed in the publication. The subscriptions in code look correct. The issue is likely that the Supabase Realtime connection uses WebSocket, and the channel subscriptions might have a naming conflict or the filters are not matching. 

Possible root cause: The Supabase Realtime system requires `REPLICA IDENTITY` to be set to `FULL` on tables for filtered subscriptions (`filter: post_id=eq.xxx`) to work. By default, tables have `REPLICA IDENTITY DEFAULT` which only includes the primary key in the old record, meaning filtered subscriptions on non-PK columns silently fail.

**Fix**: Set `REPLICA IDENTITY FULL` on all relevant tables so that filtered realtime subscriptions work correctly.

### 3. Messages Not Appearing in Realtime in Active Chat
Same root cause as above -- the `receiver_id` filter on the messages table subscription requires `REPLICA IDENTITY FULL`. The unread badge (useUnreadMessages) also uses a filtered subscription but re-fetches the count, so the badge appears after page reload but the inline messages don't update.

**Fix**: Set `REPLICA IDENTITY FULL` on the messages table as well.

## Changes

### 1. Database Migration
Set `REPLICA IDENTITY FULL` on all tables that use filtered realtime subscriptions:

```sql
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE posts REPLICA IDENTITY FULL;
ALTER TABLE comments REPLICA IDENTITY FULL;
ALTER TABLE comment_likes REPLICA IDENTITY FULL;
ALTER TABLE post_likes REPLICA IDENTITY FULL;
```

### 2. Fix ReactionPicker (`src/components/feed/ReactionPicker.tsx`)
- Add an invisible bridge div between the trigger and the picker to prevent hover gap
- Position the bridge to fill the space between the button and the picker
- This ensures continuous hover area so the picker doesn't disappear when moving the mouse upward

### 3. Messages Realtime Improvements (`src/pages/Messages.tsx`)
The current code already has INSERT/UPDATE/DELETE subscriptions. Once REPLICA IDENTITY FULL is set, the filtered subscriptions will start working. No code changes needed for messages -- the database fix resolves the issue.

## Files to Modify

| File | Change |
|------|--------|
| New database migration | Set REPLICA IDENTITY FULL on 5 tables |
| `src/components/feed/ReactionPicker.tsx` | Add invisible hover bridge between trigger and picker |

## Technical Details

**Why REPLICA IDENTITY FULL is needed:**
Supabase Realtime uses PostgreSQL logical replication. When a filter like `filter: receiver_id=eq.xxx` is used, the system needs the column value in the WAL (Write-Ahead Log) output. With the default replica identity (which only includes PK columns), non-PK column values are not available for filtering, so filtered subscriptions silently receive no events. Setting REPLICA IDENTITY FULL includes all columns in the WAL output, enabling proper filtering.

## Expected Result
- All 6 reaction emojis appear reliably on hover for both posts and comments
- New posts appear in the feed in realtime without page reload
- Comments and reactions update in realtime
- Messages appear instantly in active chat without page reload
- Message edits and deletes are reflected in realtime for the recipient
