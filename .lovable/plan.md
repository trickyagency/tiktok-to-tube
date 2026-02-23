

## Auto-Enable ReScrape for Low/Empty Video Accounts

### What Changes
Currently, the "ReScrape" button on TikTok account cards has a strict 15-day cooldown. This update will **bypass the cooldown** for accounts that have low (fewer than 5) or zero unpublished videos remaining, so you can immediately rescrape them without waiting.

### How It Works

1. Add a new hook `useUnpublishedVideosCount` to get the count of unpublished videos per account
2. In the `TikTokAccountCard`, use that count to override the 15-day cooldown logic:
   - If unpublished videos < 5 and the account was scraped, the button shows **"ReScrape (Low Videos)"** and is enabled regardless of cooldown
   - If unpublished videos = 0, it shows **"ReScrape (No Videos)"** with a more urgent styling

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useScrapedVideos.ts` | Add `useUnpublishedVideosCount` hook (similar to `usePublishedVideosCount` but with `is_published = false`) |
| `src/components/tiktok/TikTokAccountCard.tsx` | Import the new hook; modify `getButtonConfig()` to bypass cooldown when unpublished count < 5 |

### Technical Details

**`useScrapedVideos.ts`** -- Add new hook:
```typescript
export function useUnpublishedVideosCount(accountId: string | null) {
  // Same pattern as usePublishedVideosCount but .eq('is_published', false)
}
```

**`TikTokAccountCard.tsx`** -- Modify `getButtonConfig()`:
- Import and call `useUnpublishedVideosCount(account.id)`
- Add a new `hasLowVideos` flag: `unpublishedCount < 5 && isScraped`
- In `getButtonConfig()`, before the `isScraped && !canRescrape` (disabled) branch at line 142, add a new check:
  - If `isScraped && !canRescrape && hasLowVideos`: return enabled button with label "ReScrape (Low Videos)" or "ReScrape (No Videos)", variant `default`, amber/warning styling
- This way accounts with enough videos keep the normal cooldown, but depleted accounts get an override

### Result
- Accounts with 5+ unpublished videos: Normal 15-day cooldown (no change)
- Accounts with 1-4 unpublished videos: Button enabled with "ReScrape (Low Videos)" label
- Accounts with 0 unpublished videos: Button enabled with "ReScrape (No Videos)" label and urgent styling

