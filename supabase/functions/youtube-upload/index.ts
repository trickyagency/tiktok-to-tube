import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface UploadRequest {
  queue_item_id?: string;
  scraped_video_id?: string;
  youtube_channel_id?: string;
  title?: string;
  description?: string;
  privacy_status?: 'public' | 'unlisted' | 'private';
}

// Helper to record health events via the channel-health-engine
async function recordHealthEvent(
  supabase: any,
  action: 'record_success' | 'record_failure',
  channelId: string,
  userId: string,
  operation: string,
  errorDetails?: {
    code?: string;
    message?: string;
    httpStatus?: number;
  }
) {
  try {
    await supabase.functions.invoke('channel-health-engine', {
      body: {
        action,
        channelId,
        userId,
        operation,
        ...(errorDetails && { error: errorDetails }),
      },
    });
  } catch (e) {
    console.warn('Failed to record health event:', e);
    // Don't fail the main operation if health tracking fails
  }
}

// Helper to refresh access token if expired
async function refreshAccessToken(supabase: any, channel: any): Promise<string> {
  const tokenExpiresAt = new Date(channel.token_expires_at);
  const now = new Date();
  
  // Refresh if token expires in less than 5 minutes
  if (tokenExpiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Token expired or expiring soon, refreshing...');
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: channel.google_client_id,
        client_secret: channel.google_client_secret,
        refresh_token: channel.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Token refresh error:', tokenData);
      
      // Record failure via health engine
      await recordHealthEvent(
        supabase,
        'record_failure',
        channel.id,
        channel.user_id,
        'token_refresh',
        {
          code: tokenData.error,
          message: tokenData.error_description || tokenData.error,
        }
      );
      
      throw new Error(`Token refresh failed: ${tokenData.error_description || tokenData.error}`);
    }

    const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Update channel with new access token
    await supabase
      .from('youtube_channels')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: newExpiresAt,
      })
      .eq('id', channel.id);

    console.log('Token refreshed successfully');
    return tokenData.access_token;
  }

  return channel.access_token;
}

// Download video from TikWM
async function downloadVideo(downloadUrl: string): Promise<Blob> {
  console.log('Downloading video from:', downloadUrl);
  
  const response = await fetch(downloadUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }

  const blob = await response.blob();
  console.log('Video downloaded, size:', blob.size);
  return blob;
}

// Parse tags string into array for YouTube API
function parseTags(tagsString: string): string[] {
  if (!tagsString) return [];
  return tagsString
    .split(/[,\n]+/)
    .map(t => t.trim().replace(/^#/, ''))
    .filter(t => t.length > 0)
    .slice(0, 500); // YouTube max 500 tags
}

// Upload video to YouTube using resumable upload
async function uploadToYouTube(
  accessToken: string,
  videoBlob: Blob,
  title: string,
  description: string,
  tags: string[],
  privacyStatus: string,
  videoDuration: number
): Promise<{ videoId: string; videoUrl: string }> {
  console.log('Starting YouTube upload...');
  console.log(`Tags: ${tags.length} items`);

  // Step 1: Initialize resumable upload
  const metadata: any = {
    snippet: {
      title: title.substring(0, 100), // YouTube title limit
      description: description.substring(0, 5000), // YouTube description limit
      categoryId: '22', // People & Blogs
    },
    status: {
      privacyStatus: privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };

  // Add tags if present
  if (tags.length > 0) {
    metadata.snippet.tags = tags;
  }

  const initResponse = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': videoBlob.size.toString(),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initResponse.ok) {
    const errorText = await initResponse.text();
    console.error('YouTube init error:', errorText);
    throw new Error(`YouTube upload init failed: ${initResponse.status} - ${errorText}`);
  }

  const uploadUrl = initResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('No upload URL received from YouTube');
  }

  console.log('Got upload URL, uploading video...');

  // Step 2: Upload video content
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'video/mp4',
      'Content-Length': videoBlob.size.toString(),
    },
    body: videoBlob,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('YouTube upload error:', errorText);
    throw new Error(`YouTube upload failed: ${uploadResponse.status} - ${errorText}`);
  }

  const uploadResult = await uploadResponse.json();
  console.log('Video uploaded successfully:', uploadResult.id);

  // Use Shorts URL for videos <= 60 seconds, otherwise regular watch URL
  const isShort = videoDuration > 0 && videoDuration <= 60;
  const videoUrl = isShort
    ? `https://www.youtube.com/shorts/${uploadResult.id}`
    : `https://www.youtube.com/watch?v=${uploadResult.id}`;

  return {
    videoId: uploadResult.id,
    videoUrl,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: UploadRequest = await req.json();

    console.log('Upload request received:', JSON.stringify(body));

    let scrapedVideoId: string;
    let youtubeChannelId: string;
    let queueItemId: string | null = null;

    // If queue_item_id provided, fetch the queue item details
    if (body.queue_item_id) {
      queueItemId = body.queue_item_id;
      
      const { data: queueItem, error: queueError } = await supabase
        .from('publish_queue')
        .select('*')
        .eq('id', body.queue_item_id)
        .single();

      if (queueError || !queueItem) {
        throw new Error(`Queue item not found: ${queueError?.message}`);
      }

      scrapedVideoId = queueItem.scraped_video_id;
      youtubeChannelId = queueItem.youtube_channel_id;

      // Update queue item status to processing
      await supabase
        .from('publish_queue')
        .update({ status: 'processing' })
        .eq('id', body.queue_item_id);
    } else if (body.scraped_video_id && body.youtube_channel_id) {
      scrapedVideoId = body.scraped_video_id;
      youtubeChannelId = body.youtube_channel_id;
    } else {
      throw new Error('Either queue_item_id or (scraped_video_id + youtube_channel_id) required');
    }

    // Fetch scraped video details
    const { data: video, error: videoError } = await supabase
      .from('scraped_videos')
      .select('*')
      .eq('id', scrapedVideoId)
      .single();

    if (videoError || !video) {
      throw new Error(`Video not found: ${videoError?.message}`);
    }

    if (!video.download_url) {
      throw new Error('Video has no download URL');
    }

    // Fetch TikTok account for YouTube description settings
    const { data: tiktokAccount, error: tiktokAccountError } = await supabase
      .from('tiktok_accounts')
      .select('youtube_description, youtube_tags')
      .eq('id', video.tiktok_account_id)
      .single();

    if (tiktokAccountError) {
      console.warn(`Could not fetch TikTok account settings: ${tiktokAccountError.message}`);
    }

    // Fetch YouTube channel with credentials
    const { data: channel, error: channelError } = await supabase
      .from('youtube_channels')
      .select('*')
      .eq('id', youtubeChannelId)
      .single();

    if (channelError || !channel) {
      throw new Error(`YouTube channel not found: ${channelError?.message}`);
    }

    if (!channel.refresh_token || !channel.google_client_id || !channel.google_client_secret) {
      throw new Error('YouTube channel not properly configured');
    }

    // Get valid access token (refresh if needed)
    const accessToken = await refreshAccessToken(supabase, channel);

    // Download video from TikWM
    const videoBlob = await downloadVideo(video.download_url);

    // Build video description with account settings
    // Format: Title (3 times) + Account Description (tags are now metadata)
    const videoTitle = body.title || video.title || 'TikTok Video';
    const accountDescription = tiktokAccount?.youtube_description || '';
    const accountTags = tiktokAccount?.youtube_tags || '';
    
    let finalDescription = `${videoTitle}\n${videoTitle}\n${videoTitle}`;
    if (accountDescription) {
      finalDescription += `\n\n${accountDescription}`;
    }

    // Parse tags for YouTube metadata (not in description)
    const parsedTags = parseTags(accountTags);

    const privacyStatus = body.privacy_status || 'public';

    // Upload to YouTube
    const { videoId, videoUrl } = await uploadToYouTube(
      accessToken,
      videoBlob,
      videoTitle,
      finalDescription.trim(),
      parsedTags,
      privacyStatus,
      video.duration || 0
    );

    // Update scraped_videos to mark as published
    await supabase
      .from('scraped_videos')
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .eq('id', scrapedVideoId);

    // Update queue item if applicable
    if (queueItemId) {
      await supabase
        .from('publish_queue')
        .update({
          status: 'completed',
          youtube_video_id: videoId,
          youtube_video_url: videoUrl,
          processed_at: new Date().toISOString(),
        })
        .eq('id', queueItemId);
    }

    // Update channel's last_upload_at
    await supabase
      .from('youtube_channels')
      .update({ last_upload_at: new Date().toISOString() })
      .eq('id', youtubeChannelId);

    // Record success via health engine
    await recordHealthEvent(
      supabase,
      'record_success',
      youtubeChannelId,
      channel.user_id,
      'youtube_upload'
    );

    console.log('Upload completed successfully:', videoUrl);

    return new Response(JSON.stringify({
      success: true,
      video_id: videoId,
      video_url: videoUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in youtube-upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // If we have a queue item, update it with error
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const body = await req.clone().json().catch(() => ({}));
      
      if (body.queue_item_id) {
        const { data: queueItem } = await supabase
          .from('publish_queue')
          .select('retry_count, max_retries')
          .eq('id', body.queue_item_id)
          .single();

        if (queueItem) {
          const newRetryCount = (queueItem.retry_count || 0) + 1;
          const newStatus = newRetryCount >= queueItem.max_retries ? 'failed' : 'queued';

          await supabase
            .from('publish_queue')
            .update({
              status: newStatus,
              error_message: errorMessage,
              retry_count: newRetryCount,
            })
            .eq('id', body.queue_item_id);
        }
      }
    } catch (e) {
      console.error('Failed to update queue item with error:', e);
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
