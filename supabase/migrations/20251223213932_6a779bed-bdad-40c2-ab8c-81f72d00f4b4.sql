-- Reset stuck queue item to retry
UPDATE publish_queue 
SET status = 'queued', 
    progress_percentage = 0, 
    progress_phase = NULL, 
    error_message = NULL,
    retry_count = 0
WHERE id = 'a86440d3-783b-46c9-9fab-3359e5226904';