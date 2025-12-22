-- Add progress tracking columns to publish_queue
ALTER TABLE public.publish_queue
ADD COLUMN progress_phase TEXT DEFAULT NULL,
ADD COLUMN progress_percentage INTEGER DEFAULT 0;

-- Enable realtime for publish_queue
ALTER PUBLICATION supabase_realtime ADD TABLE publish_queue;