

## Migration: Replace Apify with Custom TikAPI Scraper

### Overview
Replace the entire Apify-based scraping system with your custom API at `https://tikapi.digitalautomators.com/v1/scrape`. This simplifies the architecture by removing the webhook pattern -- your API returns data directly (synchronously).

### Challenge: Edge Function Timeout
Your API takes 5+ minutes to respond. Supabase Edge Functions have a hard timeout (~150s free, ~400s pro). To handle this:
- The edge function will call the API with the maximum allowed timeout
- If the API responds within the limit, videos are processed inline
- If it times out, the scrape is marked as failed with a clear message so you can retry
- The scrape queue processor will process accounts one at a time with the same approach

### Changes

**1. Store TikAPI credentials as Supabase secret**
- Add `TIKAPI_API_KEY` secret with value `digitalautomators@New786#`
- The API URL `https://tikapi.digitalautomators.com/v1/scrape` will be hardcoded in the edge function (or stored as a secret too)

**2. Rewrite `apify-scraper` edge function**
- File: `supabase/functions/apify-scraper/index.ts`
- Remove all Apify-specific code (actor runs, webhooks, API key from platform_settings)
- Call `POST https://tikapi.digitalautomators.com/v1/scrape` with `X-API-Key` header and `{ username }` body
- Process the response directly: filter videos, deduplicate against existing, batch insert into `scraped_videos`
- Update progress tracking on `tiktok_accounts` table
- Use AbortController with ~290 second timeout

**3. Remove `apify-webhook` edge function**
- File: `supabase/functions/apify-webhook/index.ts` -- delete
- No longer needed since scraping is now synchronous (no callback pattern)
- Remove from `supabase/config.toml`

**4. Rewrite `scrape-queue-processor` edge function**
- File: `supabase/functions/scrape-queue-processor/index.ts`
- Replace Apify actor + webhook calls with direct TikAPI calls
- Remove Apify API key fetching from platform_settings
- Use `TIKAPI_API_KEY` secret instead
- Process one account at a time (sequential, no concurrent batches needed)

**5. Update or remove `apify-validate` edge function**
- File: `supabase/functions/apify-validate/index.ts`
- Rewrite to validate the custom API by making a test request (e.g., scrape a known account or ping endpoint)
- Rename references from "Apify" to "TikAPI" in the response

**6. Update `is_apify_configured()` DB function**
- Database migration to replace with `is_scraper_configured()` that checks for the `TIKAPI_API_KEY` secret or a platform_settings flag
- Or simply always return true since the key is now a server-side secret

**7. Update Settings page**
- File: `src/pages/dashboard/Settings.tsx`
- Remove Apify API key input/test/delete UI
- Replace with simpler TikAPI status indicator (or remove the section entirely since the key is a server secret)

**8. Update frontend hooks**
- File: `src/hooks/useApifyStatus.ts` -- rename/update to reflect new API status
- File: `src/hooks/useTikTokAccounts.ts` -- no changes needed (it calls the same edge function name)

**9. Update UI text references**
- File: `src/components/tiktok/TikTokAccountCard.tsx` -- change "Apify" references in tooltips/messages to "TikAPI" or generic "scraper"
- Various button components already use generic labels ("Scrape", "Scraping") so minimal changes needed

**10. Update `supabase/config.toml`**
- Remove `[functions.apify-webhook]` entry

### Video Processing Logic (moved from webhook to scraper)
The video deduplication, filtering (duration > 0), progress tracking, and batch insert logic currently in `apify-webhook/index.ts` will be moved into the rewritten `apify-scraper/index.ts`. The response format from your API will be detected and mapped dynamically on first run (with logging).

### Files to Create/Modify/Delete

| Action | File |
|--------|------|
| Modify | `supabase/functions/apify-scraper/index.ts` |
| Delete | `supabase/functions/apify-webhook/index.ts` |
| Modify | `supabase/functions/scrape-queue-processor/index.ts` |
| Modify | `supabase/functions/apify-validate/index.ts` |
| Modify | `supabase/config.toml` |
| Modify | `src/pages/dashboard/Settings.tsx` |
| Modify | `src/hooks/useApifyStatus.ts` |
| Migration | Update `is_apify_configured()` function |

### What Stays the Same
- Frontend scraping hooks (`useScrapeVideos`, `useScrapeQueue`, etc.) -- they call the same edge function
- `scrape_queue` table and realtime updates
- Progress tracking on `tiktok_accounts` table
- `apify_runs` table can be reused to track scrape runs (or ignored)
- All UI buttons (Scrape Now, Scrape All, ReScrape, Bulk Scrape New)

