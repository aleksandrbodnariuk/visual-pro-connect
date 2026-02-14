
# Plan: Fix Reaction Picker, Realtime Subscriptions, and Messages

## Problems Found

1. **Realtime not working for posts/comments/reactions** -- Only the `messages` table is added to the Supabase Realtime publication. The tables `posts`, `comments`, `comment_likes`, and `post_likes` are missing, so `postgres_changes` subscriptions never fire.

2. **Reaction picker doesn't appear reliably** -- The hover-based approach with `setTimeout(500ms)` is unreliable, especially on touch devices. The positioning also centers the picker instead of aligning left edge to the button (as in Facebook).

3. **Changing post reaction type fails** -- The `post_likes` table has no UPDATE RLS policy, so `supabase.from('post_likes').update(...)` silently fails.

4. **Messages don't appear in realtime in active chat** -- The realtime subscription in Messages.tsx only listens for `INSERT` on `receiver_id`. Sent messages from the other user appear, but updates (edits, deletes) and the chat list don't refresh properly.

## Changes

### 1. Database Migration

Add tables to Supabase Realtime publication and add missing RLS policy:

```sql
-- Enable realtime for missing tables
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE comment_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;

-- Add missing UPDATE policy for post_likes (needed to change reaction type)
CREATE POLICY "Users can update their post reactions"
  ON post_likes FOR UPDATE
  USING (user_id = auth.uid());
```

### 2. Fix ReactionPicker positioning and reliability (`src/components/feed/ReactionPicker.tsx`)

- Change positioning so the picker's left edge aligns with the button's left edge (like Facebook), not centered
- Reduce hover delay from 500ms to 300ms for quicker response
- Ensure the picker appears above the button with enough clearance

### 3. Fix Messages realtime (`src/pages/Messages.tsx`)

- Add subscription for UPDATE and DELETE events on messages (for edits/deletes from the other user)
- Listen for messages sent by the current user to other chats too (so the chat list updates)

## Files to Modify

| File | Change |
|------|--------|
| Database migration | Add 4 tables to realtime publication + UPDATE policy on post_likes |
| `src/components/feed/ReactionPicker.tsx` | Fix positioning (left-aligned, above button) and reduce delay |
| `src/pages/Messages.tsx` | Add UPDATE/DELETE realtime subscriptions for messages |

## Expected Result

- All 6 reaction emojis appear reliably on hover, positioned like Facebook (left-aligned above the button)
- Comments, posts, reactions update in realtime without page reload
- Messages appear instantly in chat without page reload
- Changing reaction type on posts works correctly
