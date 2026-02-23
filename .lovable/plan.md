

## Auto Re-scrape When Videos Run Out

### What This Does
Jab kisi TikTok account ki saari videos publish ho jayein (unpublished videos = 0), toh schedule-processor automatically us account ko scrape queue mein daal dega taake naye videos import ho jayein. Is tarah aapko manually scrape karne ki zaroorat nahi hogi.

### How It Works

1. When the schedule-processor finds **0 unpublished videos** for an account, instead of just skipping, it will:
   - Check if the account was already scraped recently (within the last 6 hours) to avoid spamming
   - Check if there's already a pending/processing scrape queue item for this account
   - If neither, insert a new `scrape_queue` entry for this account
   - Log it and continue (the `scrape-queue-processor` cron will pick it up)

2. The schedule will still skip that time slot (no video to upload), but the next time the scrape completes and new videos appear, the schedule will automatically resume uploading.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/schedule-processor/index.ts` | Add auto-rescrape logic when unpublished videos = 0 |

### Technical Details

**In `schedule-processor/index.ts`**, at lines 463-468 where it currently says "No unpublished videos available" and skips:

```text
NEW LOGIC:
1. Check tiktok_accounts.last_scraped_at -- if less than 6 hours ago, skip (cooldown)
2. Check tiktok_accounts.account_status -- if 'deleted', skip (no point scraping)
3. Check scrape_queue for pending/processing item for this account -- if exists, skip
4. Insert into scrape_queue: { tiktok_account_id, user_id, status: 'pending', priority: 0 }
5. Log: "Auto-queued rescrape for account X (videos depleted)"
```

This keeps the logic entirely server-side in the schedule-processor -- no frontend changes needed. The existing `scrape-queue-processor` cron job will automatically process the new queue item.

### Safety Guards
- **6-hour cooldown**: Won't re-scrape the same account more than once every 6 hours
- **Deleted account check**: Won't try to scrape accounts marked as deleted/not_found
- **Duplicate prevention**: Won't queue if there's already a pending/processing scrape for that account
- **No blocking**: The schedule still skips gracefully; scraping happens asynchronously via the queue

