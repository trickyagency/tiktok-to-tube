-- Fix missing redirect URI for the YouTube channel
UPDATE youtube_channels 
SET google_redirect_uri = 'https://repostflow.digitalautomators.com/functions/v1/youtube-oauth?action=callback'
WHERE google_redirect_uri IS NULL;