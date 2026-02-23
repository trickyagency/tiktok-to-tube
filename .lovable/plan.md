

## Fix: TikAPI Video Mapping - All Videos Being Dropped

### Root Cause
The TikAPI (`tikapi.digitalautomators.com`) returns video data with field names that don't match the `mapVideoData` function's expected fields. Most critically, `duration_seconds` is not recognized, so all videos get `duration = 0` and are filtered out as "slideshows."

### Evidence from Logs
```
Sample item keys: video_id, username, video_url, title, duration_seconds, 
                  upload_date, view_count, like_count, comment_count, 
                  repost_count, save_count, thumbnail, artists, track
Raw videos: 80
Mapped videos (after duration filter): 0   <-- ALL DROPPED
```

### Field Mapping Gaps

| TikAPI Field | Currently Checked Fields | Status |
|---|---|---|
| `duration_seconds` | `videoDuration`, `duration`, `video_duration` | MISSING - causes all videos to be dropped |
| `thumbnail` | `coverUrl`, `thumbnail_url`, `cover` | MISSING |
| `repost_count` | `shareCount`, `share_count`, `shares` | MISSING |
| `save_count` | (not captured) | MISSING |
| `upload_date` | `postDate`, `created_at`, `createTime` | MISSING |
| `title` | `videoDescription`, `description`, `title` | OK (matched via `title`) |
| `video_id` | `id`, `video_id`, `tiktok_video_id` | OK |
| `video_url` | `videoUrl`, `video_url`, `url` | OK |
| `view_count` | `playCount`, `view_count`, `views` | OK |
| `like_count` | `diggCount`, `like_count`, `likes` | OK |
| `comment_count` | `commentCount`, `comment_count`, `comments` | OK |

### Changes

**1. `supabase/functions/apify-scraper/index.ts`** - Update `mapVideoData` function:
- Add `duration_seconds` to the duration extraction chain
- Add `thumbnail` to the thumbnail URL chain
- Add `repost_count` to the share count chain
- Add `upload_date` to the scraped_at chain
- Add `download_url` fallback for TikAPI format

**2. `supabase/functions/scrape-queue-processor/index.ts`** - Same `mapVideoData` fix (identical function):
- Apply the same field mapping updates to keep both functions in sync

### Specific Code Change (both files)

```typescript
// Duration - ADD duration_seconds
const duration = item.videoDuration || item.duration || item.video_duration || item.duration_seconds || 0;

// Thumbnail - ADD thumbnail
thumbnail_url: item.coverUrl || item.thumbnail_url || item.cover || item.thumbnail || null,

// Share count - ADD repost_count
share_count: item.shareCount || item.share_count || item.shares || item.repost_count || 0,

// Scraped at / upload date - ADD upload_date
scraped_at: item.postDate || item.created_at || item.createTime || item.upload_date || new Date().toISOString(),
```

### Impact
- All 80+ videos per account that are currently being silently dropped will now be properly imported
- Both manual scraping (apify-scraper) and queue-based scraping (scrape-queue-processor) will be fixed
- No database changes needed
- Both edge functions will be redeployed

