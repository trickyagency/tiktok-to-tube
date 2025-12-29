-- Update the pending channel with the correct redirect URI
UPDATE youtube_channels 
SET google_redirect_uri = 'https://repostflow.digitalautomators.com/functions/v1/youtube-oauth?action=callback'
WHERE id = 'e1fd01f0-cc12-4993-993d-f69d24aab1c6';