

## Update Missed Uploads Widget: Distinguish "No Videos" vs "Timing Miss"

### What Changes
The Missed Uploads widget currently treats all missed schedules the same. This update will show two distinct categories with different icons, colors, and messages:

- **No Videos Available** (blue/info icon) -- The schedule fired but all videos for that TikTok account are already published. Auto re-scrape may have been triggered.
- **Timing Miss** (amber/warning icon) -- The schedule processor didn't fire at all for this time slot. This is the more concerning case.

### How It Works

The hook will fetch unpublished video counts per TikTok account and attach a `reason` field to each missed upload entry:
- Query `scraped_videos` grouped by `tiktok_account_id` where `is_published = false` to get counts
- If unpublished count for that account is 0: reason = `'no_videos'`
- Otherwise: reason = `'timing_miss'`

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useMissedUploads.ts` | Add `reason` field to `MissedUpload` interface; query unpublished video counts; assign reason per entry |
| `src/components/dashboard/MissedUploadsWidget.tsx` | Show different icon, color, and label based on `reason`; group/sort by reason |

### Technical Details

**`useMissedUploads.ts`**:
- Add `reason: 'no_videos' | 'timing_miss'` to the `MissedUpload` interface
- After building the `missed` array, collect unique `tiktokAccountId` values
- Query `scraped_videos` with `.eq('is_published', false)` for those account IDs, using a count query per account
- For each missed entry, set `reason = 'no_videos'` if that account has 0 unpublished videos, otherwise `'timing_miss'`

**`MissedUploadsWidget.tsx`**:
- **No Videos**: Use `VideoOff` icon (from lucide-react), blue styling (`border-blue-500/20`, `bg-blue-500/10`), label: "No videos available -- auto re-scrape queued"
- **Timing Miss**: Keep current amber styling with `Clock` icon, label: "Schedule didn't fire"
- Show grouped counts in the header: e.g., "Missed Uploads (2 timing, 3 no videos)"
- Sort timing misses first (more urgent) then no-videos entries

