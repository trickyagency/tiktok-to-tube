-- Fix publish_queue URLs for Shorts (videos <= 60 seconds)
UPDATE publish_queue pq
SET youtube_video_url = 'https://www.youtube.com/shorts/' || pq.youtube_video_id
FROM scraped_videos sv
WHERE pq.scraped_video_id = sv.id
  AND sv.duration IS NOT NULL
  AND sv.duration > 0
  AND sv.duration <= 60
  AND pq.youtube_video_url IS NOT NULL
  AND pq.youtube_video_url LIKE '%/watch?v=%';

-- Fix upload_logs URLs for Shorts (videos <= 60 seconds)
UPDATE upload_logs ul
SET youtube_video_url = 'https://www.youtube.com/shorts/' || ul.youtube_video_id
FROM scraped_videos sv
WHERE ul.scraped_video_id = sv.id
  AND sv.duration IS NOT NULL
  AND sv.duration > 0
  AND sv.duration <= 60
  AND ul.youtube_video_url IS NOT NULL
  AND ul.youtube_video_url LIKE '%/watch?v=%';