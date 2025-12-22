import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    await supabase
      .from('youtube_channels')
      .update({ access_token: tokenData.access_token, token_expires_at: newExpiresAt })
      .eq('id', channel.id);

    return tokenData.access_token;
  }

  return channel.access_token;
}

async function downloadVideo(downloadUrl: string): Promise<Blob> {
  const response = await fetch(downloadUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }

  return await response.blob();
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

async function processQueueItem(supabase: any, queueItem: any): Promise<void> {
  const queueId = queueItem.id;
  console.log(`Processing queue item: ${queueId}`);

  try {
    // Update status to processing with initial progress
    await supabase
      .from('publish_queue')
      .update({ 
        status: 'processing',
        progress_phase: 'downloading',
        progress_percentage: 0
      })
      .eq('id', queueId);

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

    // Update progress: finalizing
    await supabase
      .from('publish_queue')
      .update({ progress_phase: 'finalizing', progress_percentage: 90 })
      .eq('id', queueId);

    // Mark video as published
    await supabase
      .from('scraped_videos')
      .update({ is_published: true, published_at: new Date().toISOString() })
      .eq('id', queueItem.scraped_video_id);

    // Update queue item as completed
    await supabase
      .from('publish_queue')
      .update({
        status: 'completed',
        youtube_video_id: videoId,
        youtube_video_url: videoUrl,
        processed_at: new Date().toISOString(),
        progress_phase: null,
        progress_percentage: 100,
      })
      .eq('id', queueId);

    // Update channel's last upload
    await supabase
      .from('youtube_channels')
      .update({ last_upload_at: new Date().toISOString() })
      .eq('id', queueItem.youtube_channel_id);

    console.log(`Queue item ${queueId} completed: ${videoUrl}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Queue item ${queueId} failed:`, errorMessage);

    // Update with error and increment retry
    const newRetryCount = (queueItem.retry_count || 0) + 1;
    const newStatus = newRetryCount >= queueItem.max_retries ? 'failed' : 'queued';

    await supabase
      .from('publish_queue')
      .update({
        status: newStatus,
        error_message: errorMessage,
        retry_count: newRetryCount,
      })
      .eq('id', queueId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('Process queue started at:', new Date().toISOString());

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
