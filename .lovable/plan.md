

## Optimize: Parallel Scraping in Queue Processor

Since your TikAPI can handle unlimited concurrent requests, we'll update the `scrape-queue-processor` to process multiple accounts in parallel instead of one at a time.

### What Changes

**`supabase/functions/scrape-queue-processor/index.ts`**
- Increase the queue fetch limit from 1 to 5 (or 10) pending items per run
- Use `Promise.allSettled()` to process all fetched items concurrently -- each account's API call runs in parallel
- All scrapes fire simultaneously, so a batch of 5 accounts finishes in roughly the time of the slowest one (instead of 5x sequential)
- Return aggregated results (total processed, succeeded, failed)

**`supabase/functions/apify-scraper/index.ts`**
- No changes needed -- single-account scraping (triggered from UI "Scrape Now" button) already works fine

### Technical Details

Current flow:
```text
Fetch 1 pending item --> Process it --> Return result
```

New flow:
```text
Fetch up to 5 pending items --> Process ALL in parallel (Promise.allSettled) --> Return aggregated results
```

The edge function timeout (~290s) still applies to the entire function execution. Since all API calls run in parallel, the total time is limited by the slowest single account -- not the sum of all accounts. This is much more efficient.

Each individual account still has its own AbortController with a 280-second timeout, and failed items still retry with exponential backoff as before.

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/scrape-queue-processor/index.ts` | Fetch up to 5 items, process with `Promise.allSettled()` |

