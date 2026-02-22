

## Show "TikTok User Deleted" Status More Prominently

### What Changes

**1. Detect deleted accounts in the TikAPI scraper**
- In `supabase/functions/apify-scraper/index.ts`: When the API returns an error or empty result indicating the account doesn't exist, update `account_status` to `'deleted'` or `'not_found'` on the `tiktok_accounts` table
- Similarly update `supabase/functions/scrape-queue-processor/index.ts`

**2. Make the "Deleted" status more prominent on TikTok Account Cards**
- In `src/components/tiktok/TikTokAccountCard.tsx`:
  - Add a red overlay banner across the card saying "TikTok Account Deleted" with UserX icon
  - Disable the Scrape button for deleted accounts (no point scraping a deleted user)
  - Keep the grayscale avatar (already there) but add a strikethrough on the username
  - Show a tooltip explaining what "deleted" means

**3. Make the "Deleted" status visible in Table view**
- In `src/components/tiktok/TikTokAccountsTable.tsx`:
  - The "Deleted" badge already shows, but add a red row background tint for deleted accounts so they stand out
  - Disable scrape actions for deleted accounts in the dropdown menu

**4. Add a filter option to show/hide deleted accounts**
- In `src/components/tiktok/TikTokFiltersToolbar.tsx`: Add an "Account Status" filter dropdown with options: All, Active, Private, Deleted -- so users can quickly find deleted accounts or hide them

### Technical Details

**Files to modify:**

| File | Change |
|------|--------|
| `supabase/functions/apify-scraper/index.ts` | Detect deleted/not_found from API error responses, update `account_status` |
| `supabase/functions/scrape-queue-processor/index.ts` | Same deleted account detection |
| `src/components/tiktok/TikTokAccountCard.tsx` | Add prominent red banner overlay for deleted accounts, disable scrape button |
| `src/components/tiktok/TikTokAccountsTable.tsx` | Red row tint for deleted accounts, disable scrape in dropdown |
| `src/components/tiktok/TikTokFiltersToolbar.tsx` | Add account status filter |
| `src/pages/dashboard/TikTokAccounts.tsx` | Wire up the account status filter |

**Detection logic in scraper:**
- If the TikAPI returns a 404 or an empty videos array with an error message containing "not found" or "deleted", set `account_status = 'deleted'`
- If the API returns 0 videos for an account that previously had videos, set `account_status = 'not_found'` as a soft indicator
- On next successful sync (via "Sync Profile" which uses TikWM), status resets to `'active'` (this already works)

