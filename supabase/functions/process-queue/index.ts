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

// YouTube API quota constants
const UPLOAD_QUOTA_COST = 1600;
const DEFAULT_DAILY_QUOTA = 10000;

// ============= Upload Logging Helpers =============

async function createUploadLog(
  supabase: any, 
  queueItem: any, 
  attemptNumber: number
): Promise<string | null> {
  const { data, error } = await supabase
    .from('upload_logs')
    .insert({
      queue_item_id: queueItem.id,
      user_id: queueItem.user_id,
      youtube_channel_id: queueItem.youtube_channel_id,
      scraped_video_id: queueItem.scraped_video_id,
      attempt_number: attemptNumber,
      status: 'in_progress',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create upload log:', error.message);
    return null;
  }
  console.log(`Created upload log: ${data.id} for queue item ${queueItem.id}`);
  return data.id;
}

async function updateUploadLog(
  supabase: any, 
  logId: string | null, 
  updates: Record<string, any>
): Promise<void> {
  if (!logId) return;
  
  const { error } = await supabase
    .from('upload_logs')
    .update(updates)
    .eq('id', logId);

  if (error) {
    console.error('Failed to update upload log:', error.message);
  }
}

// ============= Quota Management =============

async function checkQuotaAvailable(supabase: any, channelId: string): Promise<{ available: boolean; reason?: string }> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('youtube_quota_usage')
    .select('quota_used, quota_limit, is_paused')
    .eq('youtube_channel_id', channelId)
    .eq('date', today)
    .maybeSingle();

  if (error) {
    console.error('Failed to check quota:', error.message);
    return { available: true }; // Allow on error to not block uploads
  }

  if (!data) {
    return { available: true }; // No usage yet today
  }

  if (data.is_paused) {
    console.log(`Channel ${channelId} is paused - skipping`);
    return { available: false, reason: 'Channel uploads are paused' };
  }

  const remainingQuota = (data.quota_limit || DEFAULT_DAILY_QUOTA) - data.quota_used;
  if (remainingQuota < UPLOAD_QUOTA_COST) {
    console.log(`Channel ${channelId} quota exhausted: ${data.quota_used}/${data.quota_limit}`);
    return { available: false, reason: `Daily quota exhausted (${data.quota_used}/${data.quota_limit} units used)` };
  }

  return { available: true };
}

async function trackQuotaUsage(supabase: any, channelId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase.rpc('increment_quota_usage', {
    p_channel_id: channelId,
    p_date: today,
    p_quota_cost: UPLOAD_QUOTA_COST
  });

  if (error) {
    console.error('Failed to track quota usage:', error.message);
  } else {
    console.log(`Tracked quota usage: ${UPLOAD_QUOTA_COST} units for channel ${channelId}`);
  }
}

// ============= Core Functions =============

async function refreshAccessToken(supabase: any, channel: any): Promise<{ token: string; duration: number }> {
  const startTime = Date.now();
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

    return { token: tokenData.access_token, duration: Date.now() - startTime };
  }

  return { token: channel.access_token, duration: Date.now() - startTime };
}

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

  const directUrl = data.data.hdplay || data.data.play;
  if (!directUrl) {
    throw new Error('No video URL in TikWM response');
  }

  console.log(`Got direct video URL: ${directUrl.substring(0, 50)}...`);
  return directUrl;
}

async function downloadVideo(videoUrl: string): Promise<{ blob: Blob; duration: number }> {
  const startTime = Date.now();
  let downloadUrl = videoUrl;

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

  if (blob.size < 10000) {
    throw new Error(`Downloaded file too small (${blob.size} bytes), likely not a video`);
  }

  return { blob, duration: Date.now() - startTime };
}

async function uploadToYouTube(
  accessToken: string,
  videoBlob: Blob,
  title: string,
  description: string,
  privacyStatus: string,
  videoDuration: number
): Promise<{ videoId: string; videoUrl: string; duration: number }> {
  const startTime = Date.now();
  
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
  
  // Use Shorts URL for videos <= 60 seconds, otherwise regular watch URL
  const isShort = videoDuration > 0 && videoDuration <= 60;
  const videoUrl = isShort
    ? `https://www.youtube.com/shorts/${result.id}`
    : `https://www.youtube.com/watch?v=${result.id}`;

  return {
    videoId: result.id,
    videoUrl,
    duration: Date.now() - startTime,
  };
}

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

// ============= User Validation =============

async function validateUserOwnership(
  supabase: any, 
  queueItem: any
): Promise<{ valid: boolean; error?: string }> {
  const queueUserId = queueItem.user_id;
  
  // Fetch video and verify user ownership
  const { data: video, error: videoError } = await supabase
    .from('scraped_videos')
    .select('user_id')
    .eq('id', queueItem.scraped_video_id)
    .single();
  
  if (videoError || !video) {
    return { valid: false, error: `Video not found: ${videoError?.message}` };
  }
  
  if (video.user_id !== queueUserId) {
    console.error(`SECURITY: User mismatch! Queue user_id=${queueUserId}, Video user_id=${video.user_id}`);
    return { valid: false, error: 'Security violation: Video does not belong to queue owner' };
  }
  
  // Fetch channel and verify user ownership
  const { data: channel, error: channelError } = await supabase
    .from('youtube_channels')
    .select('user_id')
    .eq('id', queueItem.youtube_channel_id)
    .single();
  
  if (channelError || !channel) {
    return { valid: false, error: `Channel not found: ${channelError?.message}` };
  }
  
  if (channel.user_id !== queueUserId) {
    console.error(`SECURITY: User mismatch! Queue user_id=${queueUserId}, Channel user_id=${channel.user_id}`);
    return { valid: false, error: 'Security violation: Channel does not belong to queue owner' };
  }
  
  console.log(`User ownership validated for queue item ${queueItem.id} (user: ${queueUserId})`);
  return { valid: true };
}

// ============= Main Processing =============

async function processQueueItem(supabase: any, queueItem: any): Promise<void> {
  const queueId = queueItem.id;
  const overallStartTime = Date.now();
  const attemptNumber = (queueItem.retry_count || 0) + 1;
  
  console.log(`Processing queue item: ${queueId} (attempt ${attemptNumber})`);

  // SECURITY: Validate that video, channel, and queue item all belong to the same user
  const ownershipCheck = await validateUserOwnership(supabase, queueItem);
  if (!ownershipCheck.valid) {
    console.error(`Ownership validation failed for queue item ${queueId}: ${ownershipCheck.error}`);
    await supabase
      .from('publish_queue')
      .update({
        status: 'failed',
        error_message: ownershipCheck.error,
        progress_phase: 'validation_failed',
      })
      .eq('id', queueId);
    return;
  }

  // Check quota availability BEFORE processing
  const quotaCheck = await checkQuotaAvailable(supabase, queueItem.youtube_channel_id);
  if (!quotaCheck.available) {
    console.log(`Skipping queue item ${queueId}: ${quotaCheck.reason}`);
    // Update queue item with skip reason but don't count as failure
    await supabase
      .from('publish_queue')
      .update({
        error_message: quotaCheck.reason,
        progress_phase: 'quota_exceeded',
      })
      .eq('id', queueId);
    return;
  }

  // Create upload log entry
  const logId = await createUploadLog(supabase, queueItem, attemptNumber);
  
  // Phase timing trackers
  let tokenRefreshDuration = 0;
  let downloadDuration = 0;
  let uploadDuration = 0;
  let videoSizeBytes = 0;
  let currentPhase = 'initializing';

  try {
    // Update status to processing
    await supabase
      .from('publish_queue')
      .update({
        status: 'processing',
        progress_phase: 'downloading',
        progress_percentage: 0,
        started_at: new Date().toISOString()
      })
      .eq('id', queueId);

    // Fetch video details
    currentPhase = 'fetching_video';
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

    // Fetch TikTok account for YouTube description settings
    const { data: tiktokAccount, error: tiktokAccountError } = await supabase
      .from('tiktok_accounts')
      .select('youtube_description, youtube_tags')
      .eq('id', video.tiktok_account_id)
      .single();

    if (tiktokAccountError) {
      console.warn(`Could not fetch TikTok account settings: ${tiktokAccountError.message}`);
    }

    // Fetch channel with credentials
    currentPhase = 'fetching_channel';
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
    currentPhase = 'token_refresh';
    const tokenResult = await refreshAccessToken(supabase, channel);
    tokenRefreshDuration = tokenResult.duration;
    const accessToken = tokenResult.token;

    // Update progress: downloading
    currentPhase = 'downloading';
    await supabase
      .from('publish_queue')
      .update({ progress_phase: 'downloading', progress_percentage: 10 })
      .eq('id', queueId);

    // Download video with fallback to replacement if download fails
    console.log(`Downloading video for queue item ${queueId}...`);
    let downloadResult;
    let currentVideo = video;
    
    try {
      downloadResult = await downloadVideo(video.download_url);
    } catch (downloadError) {
      const downloadErrorMsg = downloadError instanceof Error ? downloadError.message : 'Download failed';
      console.error(`Download failed for video ${video.id}: ${downloadErrorMsg}`);
      console.log(`Attempting to find replacement video...`);
      
      // Mark this video as unavailable (likely deleted from TikTok)
      await supabase
        .from('scraped_videos')
        .update({ 
          is_published: true,
          download_url: null,
        })
        .eq('id', video.id);
      
      // Get the TikTok account ID from the schedule or scraped video
      const { data: scrapedVideo } = await supabase
        .from('scraped_videos')
        .select('tiktok_account_id')
        .eq('id', video.id)
        .single();
      
      if (scrapedVideo) {
        // Find a replacement video from same account
        const { data: replacementVideo } = await supabase
          .from('scraped_videos')
          .select('*')
          .eq('tiktok_account_id', scrapedVideo.tiktok_account_id)
          .eq('is_published', false)
          .neq('id', video.id)
          .not('download_url', 'is', null)
          .order('scraped_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (replacementVideo) {
          console.log(`Found replacement video: ${replacementVideo.id}`);
          
          // Update queue item with replacement video
          await supabase
            .from('publish_queue')
            .update({ 
              scraped_video_id: replacementVideo.id,
              error_message: `Original video unavailable, using replacement`,
            })
            .eq('id', queueId);
          
          // Try to download replacement
          try {
            downloadResult = await downloadVideo(replacementVideo.download_url);
            currentVideo = replacementVideo;
            console.log(`Successfully downloaded replacement video ${replacementVideo.id}`);
          } catch (replacementError) {
            // Mark replacement as unavailable too
            await supabase
              .from('scraped_videos')
              .update({ is_published: true, download_url: null })
              .eq('id', replacementVideo.id);
            throw new Error(`Video unavailable and replacement also failed to download`);
          }
        } else {
          throw new Error(`Video unavailable on TikTok and no replacement found`);
        }
      } else {
        throw new Error(`Video unavailable and could not find account for replacement`);
      }
    }
    
    downloadDuration = downloadResult.duration;
    videoSizeBytes = downloadResult.blob.size;

    // Update progress: uploading
    currentPhase = 'uploading';
    await supabase
      .from('publish_queue')
      .update({ progress_phase: 'uploading', progress_percentage: 40 })
      .eq('id', queueId);

    // Build video description with account settings
    // Format: Title (3 times) + Account Description + Account Tags
    const videoTitle = currentVideo.title || 'TikTok Video';
    const accountDescription = tiktokAccount?.youtube_description || '';
    const accountTags = tiktokAccount?.youtube_tags || '';
    
    let finalDescription = `${videoTitle}\n${videoTitle}\n${videoTitle}`;
    if (accountDescription) {
      finalDescription += `\n\n${accountDescription}`;
    }
    if (accountTags) {
      finalDescription += `\n\n${accountTags}`;
    }

    // Upload to YouTube
    console.log(`Uploading to YouTube for queue item ${queueId}...`);
    const uploadResult = await uploadToYouTube(
      accessToken,
      downloadResult.blob,
      videoTitle,
      finalDescription.trim(),
      'public',
      currentVideo.duration || 0
    );
    uploadDuration = uploadResult.duration;

    console.log(`YouTube upload successful: ${uploadResult.videoUrl}`);

    // Update progress: finalizing
    currentPhase = 'finalizing';
    await supabase
      .from('publish_queue')
      .update({ progress_phase: 'finalizing', progress_percentage: 90 })
      .eq('id', queueId);

    const finalizeStartTime = Date.now();

    // Mark video as published (use currentVideo which may be a replacement)
    await updateWithRetry(
      supabase,
      'scraped_videos',
      { is_published: true, published_at: new Date().toISOString() },
      'id',
      currentVideo.id
    );

    // Update queue item as published
    const queueUpdated = await updateWithRetry(
      supabase,
      'publish_queue',
      {
        status: 'published',
        youtube_video_id: uploadResult.videoId,
        youtube_video_url: uploadResult.videoUrl,
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
      throw new Error(`Failed to update queue item after successful upload. Video was uploaded to: ${uploadResult.videoUrl}`);
    }

    // Update channel's last upload
    await updateWithRetry(
      supabase,
      'youtube_channels',
      { last_upload_at: new Date().toISOString() },
      'id',
      queueItem.youtube_channel_id
    );

    // Track quota usage after successful upload
    await trackQuotaUsage(supabase, queueItem.youtube_channel_id);

    const finalizeDuration = Date.now() - finalizeStartTime;
    const totalDuration = Date.now() - overallStartTime;

    // Update upload log with success
    await updateUploadLog(supabase, logId, {
      status: 'success',
      completed_at: new Date().toISOString(),
      token_refresh_duration_ms: tokenRefreshDuration,
      download_duration_ms: downloadDuration,
      upload_duration_ms: uploadDuration,
      finalize_duration_ms: finalizeDuration,
      total_duration_ms: totalDuration,
      video_size_bytes: videoSizeBytes,
      youtube_video_id: uploadResult.videoId,
      youtube_video_url: uploadResult.videoUrl,
    });

    console.log(`Queue item ${queueId} completed in ${totalDuration}ms: ${uploadResult.videoUrl}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Queue item ${queueId} failed at phase '${currentPhase}':`, errorMessage);

    const totalDuration = Date.now() - overallStartTime;

    // Update upload log with failure
    await updateUploadLog(supabase, logId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_phase: currentPhase,
      error_message: errorMessage,
      token_refresh_duration_ms: tokenRefreshDuration,
      download_duration_ms: downloadDuration,
      upload_duration_ms: uploadDuration,
      total_duration_ms: totalDuration,
      video_size_bytes: videoSizeBytes,
    });

    // Update queue with error and increment retry
    const newRetryCount = attemptNumber;
    const newStatus = newRetryCount >= queueItem.max_retries ? 'failed' : 'queued';

    await supabase
      .from('publish_queue')
      .update({
        status: newStatus,
        error_message: errorMessage,
        retry_count: newRetryCount,
        started_at: null,
        progress_phase: null,
      })
      .eq('id', queueId);
  }
}

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
      .limit(20); // Increased limit for concurrent processing

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

    // Group items by YouTube channel for concurrent processing
    const itemsByChannel: Map<string, typeof queueItems> = new Map();
    for (const item of queueItems) {
      const channelId = item.youtube_channel_id;
      if (!itemsByChannel.has(channelId)) {
        itemsByChannel.set(channelId, []);
      }
      itemsByChannel.get(channelId)!.push(item);
    }

    console.log(`Processing ${queueItems.length} items across ${itemsByChannel.size} channels concurrently`);

    // Track results
    let processed = 0;
    let failed = 0;

    // Process channels concurrently - one item at a time per channel
    const channelPromises = Array.from(itemsByChannel.entries()).map(
      async ([channelId, items]) => {
        console.log(`Channel ${channelId}: processing ${items.length} items`);
        
        // Process items sequentially within a channel (YouTube rate limits)
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          try {
            await processQueueItem(supabase, item);
            processed++;
          } catch (e) {
            console.error(`Failed to process item ${item.id}:`, e);
            failed++;
          }

          // 2s delay between uploads on same channel to respect rate limits
          if (i < items.length - 1) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }
    );

    // All channels process in parallel
    await Promise.all(channelPromises);

    console.log(`Process queue completed: ${processed} processed, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      total: queueItems.length,
      channelsProcessed: itemsByChannel.size,
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
