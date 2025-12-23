import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Timeout for stuck items (5 minutes)
const STUCK_TIMEOUT_MS = 5 * 60 * 1000;

// Helper to refresh access token if expired
async function refreshAccessToken(supabase: any, channel: any): Promise<string> {
  const tokenExpiresAt = new Date(channel.token_expires_at);
  const now = new Date();
  
  if (tokenExpiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log(`Refreshing token for channel ${channel.id}...`);
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: channel.google_client_id,
        client_secret: channel.google_client_secret,
        refresh_token: channel.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(`Token refresh failed: ${tokenData.error_description || tokenData.error}`);
    }

    const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
    const { error: updateError } = await supabase
      .from('youtube_channels')
      .update({ access_token: tokenData.access_token, token_expires_at: newExpiresAt })
      .eq('id', channel.id);

    if (updateError) {
      console.error('Failed to update token:', updateError.message);
    }

    return tokenData.access_token;
  }

  return channel.access_token;
}

// Get direct video URL from TikTok page URL using TikWM API
async function getDirectVideoUrl(tiktokUrl: string): Promise<string> {
  console.log(`Getting direct video URL for: ${tiktokUrl}`);
  
  const response = await fetch('https://tikwm.com/api/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ url: tiktokUrl }),
  });

  if (!response.ok) {
    throw new Error(`TikWM API failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.code !== 0 || !data.data) {
    throw new Error(`TikWM API error: ${data.msg || 'Unknown error'}`);
  }

  // Prefer HD version, fallback to regular
  const directUrl = data.data.hdplay || data.data.play;
  if (!directUrl) {
    throw new Error('No video URL in TikWM response');
  }

  console.log(`Got direct video URL: ${directUrl.substring(0, 50)}...`);
  return directUrl;
}

async function downloadVideo(videoUrl: string): Promise<Blob> {
  let downloadUrl = videoUrl;

  // If this is a TikTok page URL, get the direct video URL first
  if (videoUrl.includes('tiktok.com')) {
    downloadUrl = await getDirectVideoUrl(videoUrl);
  }

  console.log(`Downloading from: ${downloadUrl.substring(0, 80)}...`);
  
  const response = await fetch(downloadUrl, {
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.tiktok.com/',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }

  const blob = await response.blob();
  console.log(`Downloaded video: ${blob.size} bytes, type: ${blob.type}`);
  
  // Validate it's actually a video
  if (blob.size < 10000) {
    throw new Error(`Downloaded file too small (${blob.size} bytes), likely not a video`);
  }

  return blob;
}

async function uploadToYouTube(
  accessToken: string,
  videoBlob: Blob,
  title: string,
  description: string,
  privacyStatus: string
): Promise<{ videoId: string; videoUrl: string }> {
  const metadata = {
    snippet: {
      title: title.substring(0, 100),
      description: description.substring(0, 5000),
      categoryId: '22',
    },
    status: {
      privacyStatus: privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };

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
    throw new Error(`YouTube upload init failed: ${initResponse.status} - ${errorText}`);
  }

  const uploadUrl = initResponse.headers.get('Location');
  if (!uploadUrl) throw new Error('No upload URL received');

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
    throw new Error(`YouTube upload failed: ${uploadResponse.status} - ${errorText}`);
  }

  const result = await uploadResponse.json();
  return {
    videoId: result.id,
    videoUrl: `https://www.youtube.com/watch?v=${result.id}`,
  };
}

// Retry wrapper for database updates
async function updateWithRetry(
  supabase: any,
  table: string,
  data: any,
  matchColumn: string,
  matchValue: string,
  maxRetries: number = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await supabase
      .from(table)
      .update(data)
      .eq(matchColumn, matchValue);
    
    if (!error) {
      return true;
    }
    
    console.error(`DB update attempt ${attempt}/${maxRetries} failed for ${table}:`, error.message);
    
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  
  return false;
}

async function processQueueItem(supabase: any, queueItem: any): Promise<void> {
  const queueId = queueItem.id;
  console.log(`Processing queue item: ${queueId}`);

  try {
    // Update status to processing with initial progress and started_at timestamp
    const { error: startError } = await supabase
      .from('publish_queue')
      .update({ 
        status: 'processing',
        progress_phase: 'downloading',
        progress_percentage: 0,
        started_at: new Date().toISOString()
      })
      .eq('id', queueId);

    if (startError) {
      console.error('Failed to update status to processing:', startError.message);
    }

    // Fetch video details
    const { data: video, error: videoError } = await supabase
      .from('scraped_videos')
      .select('*')
      .eq('id', queueItem.scraped_video_id)
      .single();

    if (videoError || !video) {
      throw new Error(`Video not found: ${videoError?.message}`);
    }

    if (!video.download_url) {
      throw new Error('Video has no download URL');
    }

    // Fetch channel with credentials
    const { data: channel, error: channelError } = await supabase
      .from('youtube_channels')
      .select('*')
      .eq('id', queueItem.youtube_channel_id)
      .single();

    if (channelError || !channel) {
      throw new Error(`Channel not found: ${channelError?.message}`);
    }

    if (!channel.refresh_token || !channel.google_client_id || !channel.google_client_secret) {
      throw new Error('Channel not properly configured');
    }

    // Get valid access token
    const accessToken = await refreshAccessToken(supabase, channel);

    // Update progress: downloading
    await supabase
      .from('publish_queue')
      .update({ progress_phase: 'downloading', progress_percentage: 10 })
      .eq('id', queueId);

    // Download video
    console.log(`Downloading video for queue item ${queueId}...`);
    const videoBlob = await downloadVideo(video.download_url);

    // Update progress: uploading
    await supabase
      .from('publish_queue')
      .update({ progress_phase: 'uploading', progress_percentage: 40 })
      .eq('id', queueId);

    // Upload to YouTube
    console.log(`Uploading to YouTube for queue item ${queueId}...`);
    const { videoId, videoUrl } = await uploadToYouTube(
      accessToken,
      videoBlob,
      video.title || 'TikTok Video',
      video.description || '',
      'public'
    );

    console.log(`YouTube upload successful: ${videoUrl}`);

    // Update progress: finalizing
    await supabase
      .from('publish_queue')
      .update({ progress_phase: 'finalizing', progress_percentage: 90 })
      .eq('id', queueId);

    // Mark video as published with retry
    const videoUpdated = await updateWithRetry(
      supabase,
      'scraped_videos',
      { is_published: true, published_at: new Date().toISOString() },
      'id',
      queueItem.scraped_video_id
    );

    if (!videoUpdated) {
      console.error('Failed to mark video as published after retries');
    }

    // Update queue item as published with retry
    const queueUpdated = await updateWithRetry(
      supabase,
      'publish_queue',
      {
        status: 'published',
        youtube_video_id: videoId,
        youtube_video_url: videoUrl,
        processed_at: new Date().toISOString(),
        progress_phase: null,
        progress_percentage: 100,
        started_at: null,
        error_message: null,
      },
      'id',
      queueId
    );

    if (!queueUpdated) {
      throw new Error(`Failed to update queue item after successful upload. Video was uploaded to: ${videoUrl}`);
    }

    // Update channel's last upload
    await updateWithRetry(
      supabase,
      'youtube_channels',
      { last_upload_at: new Date().toISOString() },
      'id',
      queueItem.youtube_channel_id
    );

    console.log(`Queue item ${queueId} completed: ${videoUrl}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Queue item ${queueId} failed:`, errorMessage);

    // Update with error and increment retry
    const newRetryCount = (queueItem.retry_count || 0) + 1;
    const newStatus = newRetryCount >= queueItem.max_retries ? 'failed' : 'queued';

    const { error: updateError } = await supabase
      .from('publish_queue')
      .update({
        status: newStatus,
        error_message: errorMessage,
        retry_count: newRetryCount,
        started_at: null,
        progress_phase: null,
      })
      .eq('id', queueId);

    if (updateError) {
      console.error('Failed to update queue item with error status:', updateError.message);
    }
  }
}

// Reset stuck items that have been processing for too long
async function resetStuckItems(supabase: any): Promise<number> {
  const timeoutThreshold = new Date(Date.now() - STUCK_TIMEOUT_MS).toISOString();
  
  const { data: stuckItems, error } = await supabase
    .from('publish_queue')
    .update({ 
      status: 'failed', 
      error_message: 'Processing timeout - stuck for more than 5 minutes',
      progress_phase: null,
      started_at: null,
    })
    .eq('status', 'processing')
    .lt('started_at', timeoutThreshold)
    .select('id');

  if (error) {
    console.error('Failed to reset stuck items:', error.message);
    return 0;
  }

  if (stuckItems && stuckItems.length > 0) {
    console.log(`Reset ${stuckItems.length} stuck items: ${stuckItems.map((i: any) => i.id).join(', ')}`);
  }

  return stuckItems?.length || 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('Process queue started at:', new Date().toISOString());

    // First, reset any stuck items
    const stuckCount = await resetStuckItems(supabase);
    if (stuckCount > 0) {
      console.log(`Reset ${stuckCount} stuck items`);
    }

    // Fetch queue items that are due
    const { data: queueItems, error: queueError } = await supabase
      .from('publish_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(10); // Process up to 10 items per run

    if (queueError) {
      throw new Error(`Failed to fetch queue: ${queueError.message}`);
    }

    console.log(`Found ${queueItems?.length || 0} items to process`);

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No items to process',
        processed: 0,
        stuckReset: stuckCount,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process items sequentially to avoid rate limits
    let processed = 0;
    let failed = 0;

    for (const item of queueItems) {
      try {
        await processQueueItem(supabase, item);
        processed++;
      } catch (e) {
        console.error(`Failed to process item ${item.id}:`, e);
        failed++;
      }
      
      // Small delay between uploads to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`Process queue completed: ${processed} processed, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      total: queueItems.length,
      stuckReset: stuckCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in process-queue:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
