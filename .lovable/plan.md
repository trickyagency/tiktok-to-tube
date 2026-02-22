

## Fix Missed Uploads + Add Missed Uploads Monitoring Widget

### Problem
The `schedule-processor` uses exact minute matching (`time === timeString`), which means if the cron job fires at 10:01 instead of 10:00 due to timing drift or cold starts, the upload is silently skipped.

### Part 1: Fix Time Window Matching in Schedule Processor

**File: `supabase/functions/schedule-processor/index.ts`**

Replace the `isTimeToPublish` function with a time-window approach:
- Convert the current time and each publish time to total minutes since midnight
- Match if the current time is within +/-2 minutes of any publish time
- Add deduplication: before queuing, check if a video was already queued for this schedule + publish time slot today (query `publish_queue` for matching `schedule_id` with `created_at` within the last 5 minutes of the target time)

```text
Logic change:
OLD: timeString === "10:00" (exact match)
NEW: abs(currentMinutes - publishMinutes) <= 2 (window match)
     + check publish_queue for existing entry for this schedule in last 5 min
```

The deduplication check prevents double-queuing if the cron fires twice within the window:
- Query `publish_queue` for `schedule_id = X` AND `created_at > (now - 5 minutes)` AND `status IN ('queued', 'processing', 'published')`
- If found, skip (already handled this time slot)

### Part 2: Add "Missed Uploads" Monitoring Widget

**New file: `src/components/dashboard/MissedUploadsWidget.tsx`**

A dashboard widget that shows schedules that may have missed their publish time in the last 24 hours. Logic:
- Fetch all active `publish_schedules` with their `publish_times` and `timezone`
- For each schedule, calculate expected publish times in the last 24 hours
- Cross-reference with `publish_queue` entries (by `schedule_id` and `created_at` near each expected time)
- If no queue entry exists for an expected time, flag it as "missed"
- Display as a card with warning styling, listing schedule name, expected time, and channel

**New file: `src/hooks/useMissedUploads.ts`**

Custom hook to compute missed uploads by comparing expected vs actual queue entries in the last 24 hours.

**Modified file: `src/pages/dashboard/Dashboard.tsx`**

Add the `MissedUploadsWidget` below the `ChannelHealthWidget` on the dashboard.

---

### Technical Details

| File | Change |
|------|--------|
| `supabase/functions/schedule-processor/index.ts` | Replace exact matching with +/-2 min window + dedup check |
| `src/hooks/useMissedUploads.ts` | New hook: compute missed uploads from schedules vs queue |
| `src/components/dashboard/MissedUploadsWidget.tsx` | New widget: display missed uploads in last 24h |
| `src/pages/dashboard/Dashboard.tsx` | Add MissedUploadsWidget to dashboard |

### User Experience

- **No more missed uploads**: The 2-minute window ensures cron timing drift (typically under 1 minute) never causes a miss
- **No double uploads**: Deduplication check prevents the window from causing duplicate queuing
- **Visibility**: The dashboard widget shows any missed slots so you can monitor reliability at a glance
- **Auto-hides**: The widget only appears when there are missed uploads (same pattern as ChannelHealthWidget)

