

## Fix: Update YouTube Quota Cost from 1600 to 100 Units

Google has updated the `youtube.videos.insert` API to cost **100 units** instead of 1600. This means each Google Cloud Client ID can now upload **100 videos/day** instead of just 6. The platform currently hardcodes `1600` everywhere, which is why channels are being falsely paused for "quota exceeded" after only 6 uploads.

### Also Fix: "Video has no download URL" Failures

The 3 recent failed uploads are all caused by scraped videos missing a download URL. We'll add a check to skip these and pick the next video instead of failing the entire upload.

---

### Changes

**1. Update quota cost constant in all 5 locations**

| File | Change |
|------|--------|
| `supabase/functions/process-queue/index.ts` | `UPLOAD_QUOTA_COST = 1600` to `100` |
| `supabase/functions/schedule-processor/index.ts` | `UPLOAD_QUOTA_COST = 1600` to `100` |
| `src/hooks/useYouTubeQuota.ts` | `UPLOAD_QUOTA_COST = 1600` to `100` |
| `src/hooks/usePoolQuotaAggregation.ts` | `UPLOAD_QUOTA_COST = 1600` to `100` |
| DB function `check_quota_available` | Update default parameter from `1600` to `100` |

**2. Update UI display text**

The MiniQuotaBar and quota indicators will automatically show correct numbers once the constant changes (e.g., "94 uploads remaining" instead of "5 uploads remaining").

**3. Fix "Video has no download URL" failures**

In `supabase/functions/process-queue/index.ts` and `supabase/functions/schedule-processor/index.ts`:
- Before queuing a video, verify it has a valid `download_url`
- If not, skip it and pick the next unpublished video
- Mark the video with a flag so it's not repeatedly selected

### Impact

- Channels will no longer falsely pause after 6 uploads
- Each channel can now process up to **100 uploads/day**
- Videos without download URLs will be skipped instead of causing failures

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/process-queue/index.ts` | Quota cost 1600 to 100, skip videos without download URL |
| `supabase/functions/schedule-processor/index.ts` | Quota cost 1600 to 100 |
| `src/hooks/useYouTubeQuota.ts` | Quota cost 1600 to 100 |
| `src/hooks/usePoolQuotaAggregation.ts` | Quota cost 1600 to 100 |
| New SQL migration | Update `check_quota_available` default from 1600 to 100 |

