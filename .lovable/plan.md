

## Fix: Mark as Published Feature

### Root Cause

There are two issues preventing the feature from working:

1. **RLS permission mismatch (main bug)**: The owner can *view* all users' scraped videos (via the owner SELECT policy), but the UPDATE policy only allows `auth.uid() = user_id`. When the owner tries to mark videos from accounts owned by other users (e.g., `@mister_et_ptilu`, `@hauntedrules100`), the update query silently affects 0 rows -- no error is returned, but nothing changes. The code then reports "success" because it doesn't verify the update actually took effect.

2. **No verification of update result**: After calling `.update()`, the code assumes success if there's no error. But Supabase RLS silently filters rows, so the update can return no error while changing nothing.

### Affected Accounts

| Account | Owner (user_id) | Issue |
|---------|----------------|-------|
| `@misteropenbrawn` | `bc365258...` (you) | Has 0 unpublished videos -- nothing to mark |
| `@mister_et_ptilu` | `cec14264...` (other user) | RLS blocks your update |
| `@hauntedrules100` | `cec14264...` (other user) | RLS blocks your update |

### Fix Plan

**File: `src/hooks/useMarkAsPublished.ts`**

1. **Add update verification**: After the `.update()` call, re-query the video to confirm `is_published` was actually set to `true`. If it wasn't, report a meaningful error ("Permission denied -- video belongs to another user").

2. **Use service-level workaround for owners**: Since the owner needs to manage all accounts, modify the mutation to call a Supabase Edge Function (or use an RPC function) that can bypass RLS when the caller is an owner. 

   **Preferred approach**: Create a simple Supabase database function (`mark_video_as_published`) that checks if the caller is the owner (using `is_owner(auth.uid())`), and if so, performs the update regardless of `user_id`. This avoids creating a new edge function.

### Implementation Details

**Step 1: Create a database RPC function** (SQL migration)

```sql
CREATE OR REPLACE FUNCTION mark_video_as_published(
  p_video_id uuid
) RETURNS boolean AS $$
DECLARE
  v_updated boolean := false;
BEGIN
  -- Owner can update any video; regular users can only update their own
  IF is_owner(auth.uid()) OR EXISTS (
    SELECT 1 FROM scraped_videos WHERE id = p_video_id AND user_id = auth.uid()
  ) THEN
    UPDATE scraped_videos
    SET is_published = true,
        published_at = now(),
        published_via = 'manual',
        updated_at = now()
    WHERE id = p_video_id AND is_published = false;
    
    v_updated := FOUND;
  END IF;
  
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Update `useMarkAsPublished.ts`**

- Replace the direct `.update()` call with a call to `supabase.rpc('mark_video_as_published', { p_video_id: video.id })`
- Check the returned boolean: if `false`, report "Failed to update -- insufficient permissions or video already published"
- This makes the feature work for both owners and regular users

**Step 3: Add verification feedback**

- If the RPC returns `false`, add a detail entry with status `'invalid'` and message explaining the failure
- This way users get clear feedback instead of silent failures

### Result

- Owners can mark any user's videos as published
- Regular users can only mark their own videos (unchanged behavior)
- Clear error messages when something goes wrong instead of silent failures

