-- Reset the stuck queue item to queued status for retry
UPDATE publish_queue 
SET status = 'queued', 
    progress_phase = NULL, 
    progress_percentage = 0, 
    error_message = NULL,
    retry_count = 0
WHERE id = 'a86440d3-783b-46c9-9fab-3359e5226904';