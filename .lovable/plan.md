

## Fix: Clear Stuck "Processing" Scrape Queue Items

### Problem
Two scrape queue items from January 6th are permanently stuck in `processing` status. The Cancel button only removes `pending` items, so it cannot clear these.

### Solution

**1. Database Migration: Clean up stuck items + add auto-cleanup**

Run a migration that:
- Marks any `scrape_queue` items stuck in `processing` for more than 30 minutes as `failed`
- Updates the existing `cleanup-scrape-queue` cron job to also auto-release stale `processing` items (older than 30 minutes) by marking them as `failed`

**2. Update Cancel button to also handle stuck processing items**

**File:** `src/hooks/useScrapeQueue.ts`

Update `useCancelPendingItems` to also delete items stuck in `processing` status for more than 30 minutes, in addition to pending items. This gives users a way to manually clear stuck jobs.

**3. Add a "Force Clear" option in the UI when only processing items remain**

**File:** `src/components/tiktok/ScrapeQueueProgress.tsx`

When there are no pending items but processing items are stuck (e.g., older than 30 minutes), show a "Force Clear Stuck Items" button that deletes those processing items directly.

---

### Technical Details

| Change | File | What |
|--------|------|------|
| Migration | New migration SQL | Mark stuck processing items as failed; update cron job |
| Hook update | `src/hooks/useScrapeQueue.ts` | Add `useClearStuckItems` mutation that deletes processing items older than 30 min |
| UI update | `src/components/tiktok/ScrapeQueueProgress.tsx` | Show "Clear Stuck" button when processing items are stale |

### Migration SQL
```sql
-- Fix currently stuck items
UPDATE scrape_queue 
SET status = 'failed', error_message = 'Stuck in processing - auto-cleared'
WHERE status = 'processing' AND started_at < now() - interval '30 minutes';

-- Update cron job to include stale processing cleanup
SELECT cron.unschedule('cleanup-scrape-queue');
SELECT cron.schedule(
  'cleanup-scrape-queue',
  '40 4 * * *',
  $$
    DELETE FROM scrape_queue WHERE status = 'completed' AND completed_at < now() - interval '7 days';
    UPDATE scrape_queue SET status = 'failed', error_message = 'Stuck in processing - auto-cleared' WHERE status = 'processing' AND started_at < now() - interval '30 minutes';
    DELETE FROM scrape_queue WHERE status = 'failed' AND updated_at < now() - interval '7 days';
  $$
);
```

