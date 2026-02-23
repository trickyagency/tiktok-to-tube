
CREATE OR REPLACE FUNCTION public.mark_video_as_published(
  p_video_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated boolean := false;
BEGIN
  -- Owner can update any video; regular users can only update their own
  IF is_owner(auth.uid()) OR EXISTS (
    SELECT 1 FROM scraped_videos WHERE id = p_video_id AND user_id = auth.uid()
  ) THEN
    UPDATE scraped_videos
    SET is_published = true,
        published_at = now(),
        published_via = 'manual',
        updated_at = now()
    WHERE id = p_video_id AND is_published = false;
    
    v_updated := FOUND;
  END IF;
  
  RETURN v_updated;
END;
$$;
