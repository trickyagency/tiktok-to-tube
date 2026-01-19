import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// YouTube API quota constants
const UPLOAD_QUOTA_COST = 1600;
const DEFAULT_DAILY_QUOTA = 10000;

// Get current time in a specific timezone
function getCurrentTimeInTimezone(timezone: string): { hours: number; minutes: number; timeString: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  return { hours, minutes, timeString };
}

// Check if current time matches any publish time
function isTimeToPublish(publishTimes: string[], timezone: string): boolean {
  const { timeString } = getCurrentTimeInTimezone(timezone);
  console.log(`Current time in ${timezone}: ${timeString}`);
  console.log(`Publish times: ${JSON.stringify(publishTimes)}`);
  
  return publishTimes.some(time => time === timeString);
}

// Check quota availability for a channel BEFORE queuing
async function checkChannelQuota(supabase: any, channelId: string): Promise<{
  available: boolean;
  uploadsRemaining: number;
  reason?: string;
}> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('youtube_quota_usage')
    .select('quota_used, quota_limit, is_paused, uploads_count')
    .eq('youtube_channel_id', channelId)
    .eq('date', today)
    .maybeSingle();

  if (error) {
    console.error('Failed to check quota:', error.message);
    return { available: true, uploadsRemaining: 6 }; // Allow on error
  }

  if (!data) {
    // No usage yet today - full quota available
    const defaultUploads = Math.floor(DEFAULT_DAILY_QUOTA / UPLOAD_QUOTA_COST);
    return { available: true, uploadsRemaining: defaultUploads };
  }

  if (data.is_paused) {
    console.log(`Channel ${channelId} is paused - not queuing`);
    return { available: false, uploadsRemaining: 0, reason: 'Channel paused by user' };
  }

  const quotaLimit = data.quota_limit || DEFAULT_DAILY_QUOTA;
  const quotaUsed = data.quota_used || 0;
  const remaining = quotaLimit - quotaUsed;
  const uploadsRemaining = Math.floor(remaining / UPLOAD_QUOTA_COST);

  if (uploadsRemaining <= 0) {
    console.log(`Channel ${channelId} quota exhausted: ${quotaUsed}/${quotaLimit}`);
    return { 
      available: false, 
      uploadsRemaining: 0, 
      reason: `Quota exhausted (${data.uploads_count || 0} uploads today)` 
    };
  }

  return { available: true, uploadsRemaining };
}

// Select the best channel from a pool based on rotation strategy
async function selectChannelFromPool(
  supabase: any,
  schedule: any
): Promise<{ channelId: string; reason: string } | null> {
  const today = new Date().toISOString().split('T')[0];
  
  // Fetch pool with members
  const { data: pool, error: poolError } = await supabase
    .from('channel_rotation_pools')
    .select(`
      id,
      rotation_strategy,
      is_active,
      members:channel_pool_members(
        id,
        youtube_channel_id,
        priority,
        is_fallback_only,
        youtube_channel:youtube_channels(
          id,
          channel_title,
          auth_status,
          user_id
        )
      )
    `)
    .eq('id', schedule.channel_pool_id)
    .single();

  if (poolError || !pool) {
    console.error('Failed to fetch pool:', poolError?.message);
    return null;
  }

  if (!pool.is_active) {
    console.log(`Pool ${pool.id} is paused - skipping`);
    return null;
  }

  const members = pool.members || [];
  if (members.length === 0) {
    console.log(`Pool ${pool.id} has no members`);
    return null;
  }

  // Get channel IDs
  const channelIds = members.map((m: any) => m.youtube_channel_id);

  // Fetch quota data for all channels in pool
  const { data: quotaData } = await supabase
    .from('youtube_quota_usage')
    .select('*')
    .in('youtube_channel_id', channelIds)
    .eq('date', today);

  // Build availability list
  const availableChannels = members
    .filter((member: any) => {
      const channel = member.youtube_channel;
      if (!channel) return false;
      if (channel.auth_status !== 'connected') return false;
      if (channel.user_id !== schedule.user_id) return false;

      const quota = quotaData?.find((q: any) => q.youtube_channel_id === member.youtube_channel_id);
      if (quota?.is_paused) return false;

      const remaining = (quota?.quota_limit || DEFAULT_DAILY_QUOTA) - (quota?.quota_used || 0);
      const uploadsRemaining = Math.floor(remaining / UPLOAD_QUOTA_COST);
      return uploadsRemaining > 0;
    })
    .map((member: any) => ({
      ...member,
      quota: quotaData?.find((q: any) => q.youtube_channel_id === member.youtube_channel_id) || null,
      remainingUploads: Math.floor(
        ((quotaData?.find((q: any) => q.youtube_channel_id === member.youtube_channel_id)?.quota_limit || DEFAULT_DAILY_QUOTA) -
        (quotaData?.find((q: any) => q.youtube_channel_id === member.youtube_channel_id)?.quota_used || 0)) / UPLOAD_QUOTA_COST
      ),
    }));

  if (availableChannels.length === 0) {
    console.log(`All channels in pool ${pool.id} exhausted or unavailable`);
    return null;
  }

  // Select based on rotation strategy
  let selectedChannel;
  const strategy = pool.rotation_strategy || 'quota_based';

  switch (strategy) {
    case 'quota_based':
      // Pick channel with most remaining quota
      selectedChannel = availableChannels.sort((a: any, b: any) => 
        b.remainingUploads - a.remainingUploads
      )[0];
      break;

    case 'priority':
      // Use priority order (already sorted by priority in query), skip fallback-only if primaries available
      const primaries = availableChannels.filter((c: any) => !c.is_fallback_only);
      selectedChannel = primaries.length > 0 
        ? primaries.sort((a: any, b: any) => a.priority - b.priority)[0]
        : availableChannels.sort((a: any, b: any) => a.priority - b.priority)[0];
      break;

    case 'round_robin':
      // Pick channel with fewest uploads today
      selectedChannel = availableChannels.sort((a: any, b: any) => {
        const aUploads = a.quota?.uploads_count || 0;
        const bUploads = b.quota?.uploads_count || 0;
        return aUploads - bUploads;
      })[0];
      break;

    default:
      selectedChannel = availableChannels[0];
  }

  console.log(`Pool rotation (${strategy}): Selected channel ${selectedChannel.youtube_channel_id} (${selectedChannel.remainingUploads} uploads remaining)`);
  
  return {
    channelId: selectedChannel.youtube_channel_id,
    reason: `Pool rotation (${strategy}): ${selectedChannel.youtube_channel?.channel_title || 'Unknown'}`,
  };
}

// Validate that schedule, video, and channel all belong to the same user
async function validateScheduleOwnership(
  supabase: any,
  schedule: any,
  video: any,
  channelId: string
): Promise<{ valid: boolean; error?: string }> {
  const scheduleUserId = schedule.user_id;
  
  // Verify video belongs to schedule owner
  if (video.user_id !== scheduleUserId) {
    console.error(`SECURITY: User mismatch! Schedule user_id=${scheduleUserId}, Video user_id=${video.user_id}`);
    return { valid: false, error: 'Security violation: Video does not belong to schedule owner' };
  }
  
  // Fetch and verify YouTube channel belongs to schedule owner
  const { data: channel, error: channelError } = await supabase
    .from('youtube_channels')
    .select('user_id')
    .eq('id', channelId)
    .single();
  
  if (channelError || !channel) {
    return { valid: false, error: `Channel not found: ${channelError?.message}` };
  }
  
  if (channel.user_id !== scheduleUserId) {
    console.error(`SECURITY: User mismatch! Schedule user_id=${scheduleUserId}, Channel user_id=${channel.user_id}`);
    return { valid: false, error: 'Security violation: Channel does not belong to schedule owner' };
  }
  
  // Verify TikTok account belongs to schedule owner
  const { data: tiktokAccount, error: accountError } = await supabase
    .from('tiktok_accounts')
    .select('user_id')
    .eq('id', schedule.tiktok_account_id)
    .single();
  
  if (accountError || !tiktokAccount) {
    return { valid: false, error: `TikTok account not found: ${accountError?.message}` };
  }
  
  if (tiktokAccount.user_id !== scheduleUserId) {
    console.error(`SECURITY: User mismatch! Schedule user_id=${scheduleUserId}, TikTok account user_id=${tiktokAccount.user_id}`);
    return { valid: false, error: 'Security violation: TikTok account does not belong to schedule owner' };
  }
  
  console.log(`Ownership validated for schedule "${schedule.schedule_name}" (user: ${scheduleUserId})`);
  return { valid: true };
}

// Fetch video from TikWM to get watermark-free download URL
async function fetchTikWMDownloadUrl(videoUrl: string): Promise<string> {
  console.log(`Fetching TikWM download URL for: ${videoUrl}`);
  
  const response = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(videoUrl)}&hd=1`);
  const data = await response.json();
  
  if (data.code !== 0 || !data.data?.hdplay) {
    // Fallback to regular play URL
    if (data.data?.play) {
      console.log('Using regular quality video');
      return data.data.play;
    }
    throw new Error(`TikWM API error: ${data.msg || 'Unknown error'}`);
  }
  
  console.log('Got HD video download URL');
  return data.data.hdplay;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('=== Schedule Processor Started ===');
    console.log('Current UTC time:', new Date().toISOString());

    // Fetch all active schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('publish_schedules')
      .select('*')
      .eq('is_active', true);

    if (schedulesError) {
      throw new Error(`Failed to fetch schedules: ${schedulesError.message}`);
    }

    console.log(`Found ${schedules?.length || 0} active schedules`);

    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No active schedules',
        processed: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let queued = 0;
    let skipped = 0;
    let quotaSkipped = 0;
    let rotated = 0;
    const debugLog: any[] = [];

    for (const schedule of schedules) {
      const scheduleDebug: any = {
        scheduleId: schedule.id,
        scheduleName: schedule.schedule_name,
        scheduleUserId: schedule.user_id,
        tiktokAccountId: schedule.tiktok_account_id,
        youtubeChannelId: schedule.youtube_channel_id,
        channelPoolId: schedule.channel_pool_id,
        timezone: schedule.timezone || 'UTC',
        publishTimes: schedule.publish_times,
      };

      console.log(`\n--- Processing Schedule: ${schedule.schedule_name} ---`);
      console.log(`Schedule context: ${JSON.stringify(scheduleDebug)}`);

      const publishTimes = Array.isArray(schedule.publish_times) 
        ? schedule.publish_times 
        : JSON.parse(schedule.publish_times || '[]');
      
      const timezone = schedule.timezone || 'UTC';

      // Check if current time matches any publish time
      if (!isTimeToPublish(publishTimes, timezone)) {
        console.log(`Schedule "${schedule.schedule_name}" - not time to publish`);
        scheduleDebug.status = 'skipped';
        scheduleDebug.reason = 'Not time to publish';
        debugLog.push(scheduleDebug);
        skipped++;
        continue;
      }

      console.log(`Schedule "${schedule.schedule_name}" - TIME TO PUBLISH!`);

      // *** SMART CHANNEL SELECTION ***
      let targetChannelId: string;
      let channelSelectionReason: string;

      if (schedule.channel_pool_id) {
        // Use pool rotation
        const poolResult = await selectChannelFromPool(supabase, schedule);
        if (!poolResult) {
          console.log(`Schedule "${schedule.schedule_name}" - no available channels in pool`);
          scheduleDebug.status = 'skipped';
          scheduleDebug.reason = 'All channels in pool exhausted or unavailable';
          debugLog.push(scheduleDebug);
          quotaSkipped++;
          continue;
        }
        targetChannelId = poolResult.channelId;
        channelSelectionReason = poolResult.reason;
        rotated++;
      } else {
        // Direct channel assignment - check quota
        const quotaCheck = await checkChannelQuota(supabase, schedule.youtube_channel_id);
        if (!quotaCheck.available) {
          console.log(`Schedule "${schedule.schedule_name}" - quota not available: ${quotaCheck.reason}`);
          scheduleDebug.status = 'skipped';
          scheduleDebug.reason = `Quota unavailable: ${quotaCheck.reason}`;
          debugLog.push(scheduleDebug);
          quotaSkipped++;
          continue;
        }
        targetChannelId = schedule.youtube_channel_id;
        channelSelectionReason = `Direct assignment (${quotaCheck.uploadsRemaining} uploads remaining)`;
      }
      
      console.log(`Channel selected: ${targetChannelId} - ${channelSelectionReason}`);
      scheduleDebug.selectedChannelId = targetChannelId;
      scheduleDebug.channelSelectionReason = channelSelectionReason;

      // Get unpublished videos from the linked TikTok account
      let selectedVideo = null;
      const { data: unpublishedVideos, error: videosError } = await supabase
        .from('scraped_videos')
        .select('*')
        .eq('tiktok_account_id', schedule.tiktok_account_id)
        .eq('is_published', false)
        .order('scraped_at', { ascending: true })
        .limit(10);

      if (videosError) {
        console.error(`Error fetching videos for schedule "${schedule.schedule_name}":`, videosError);
        scheduleDebug.status = 'error';
        scheduleDebug.reason = `Video fetch error: ${videosError.message}`;
        debugLog.push(scheduleDebug);
        continue;
      }

      console.log(`Fetched ${unpublishedVideos?.length || 0} unpublished videos for account ${schedule.tiktok_account_id}`);
      scheduleDebug.unpublishedVideoCount = unpublishedVideos?.length || 0;

      if (!unpublishedVideos || unpublishedVideos.length === 0) {
        console.log(`No unpublished videos for schedule "${schedule.schedule_name}"`);
        scheduleDebug.status = 'skipped';
        scheduleDebug.reason = 'No unpublished videos available';
        debugLog.push(scheduleDebug);
        continue;
      }

      // Find a video that isn't already queued/processing/published
      let videosChecked = 0;
      let videosAlreadyQueued = 0;
      let ownershipFailed = 0;
      
      for (const video of unpublishedVideos) {
        videosChecked++;
        
        // Check if video is already in queue
        const { data: existingQueue, error: queueCheckError } = await supabase
          .from('publish_queue')
          .select('id, status')
          .eq('scraped_video_id', video.id)
          .in('status', ['queued', 'processing', 'published'])
          .maybeSingle();

        if (queueCheckError) {
          console.error(`Error checking queue for video ${video.id}:`, queueCheckError);
          continue;
        }

        if (existingQueue) {
          console.log(`Video ${video.id} already ${existingQueue.status}, skipping`);
          videosAlreadyQueued++;
          
          if (existingQueue.status === 'published') {
            await supabase
              .from('scraped_videos')
              .update({ is_published: true })
              .eq('id', video.id);
          }
          continue;
        }

        // Check ownership
        if (video.user_id !== schedule.user_id) {
          console.warn(`OWNERSHIP MISMATCH: Video ${video.id} belongs to user ${video.user_id}, but schedule belongs to user ${schedule.user_id}`);
          ownershipFailed++;
          continue;
        }

        selectedVideo = video;
        break;
      }

      scheduleDebug.videosChecked = videosChecked;
      scheduleDebug.videosAlreadyQueued = videosAlreadyQueued;
      scheduleDebug.ownershipFailed = ownershipFailed;

      if (!selectedVideo) {
        console.log(`No available videos for schedule "${schedule.schedule_name}"`);
        scheduleDebug.status = 'skipped';
        scheduleDebug.reason = `No valid videos: ${videosChecked} checked, ${videosAlreadyQueued} already queued, ${ownershipFailed} ownership mismatch`;
        debugLog.push(scheduleDebug);
        continue;
      }

      const video = selectedVideo;
      console.log(`Selected video: ${video.id} (tiktok_video_id: ${video.tiktok_video_id})`);

      // SECURITY: Validate ownership with the TARGET channel (which may differ from schedule.youtube_channel_id)
      const ownershipCheck = await validateScheduleOwnership(supabase, schedule, video, targetChannelId);
      if (!ownershipCheck.valid) {
        console.error(`SECURITY: Ownership validation failed for schedule "${schedule.schedule_name}": ${ownershipCheck.error}`);
        scheduleDebug.status = 'error';
        scheduleDebug.reason = `Ownership validation failed: ${ownershipCheck.error}`;
        debugLog.push(scheduleDebug);
        continue;
      }

      // Fetch the watermark-free download URL from TikWM
      let downloadUrl = video.download_url;
      try {
        downloadUrl = await fetchTikWMDownloadUrl(video.video_url);
        
        await supabase
          .from('scraped_videos')
          .update({ download_url: downloadUrl })
          .eq('id', video.id);
          
        console.log(`Updated download URL for video ${video.id}`);
      } catch (tikwmError) {
        console.error(`TikWM fetch failed for video ${video.id}:`, tikwmError);
        if (!downloadUrl) {
          console.error(`No download URL available for video ${video.id}, skipping`);
          scheduleDebug.status = 'error';
          scheduleDebug.reason = 'No download URL available';
          debugLog.push(scheduleDebug);
          continue;
        }
      }

      // Add to publish queue with the SELECTED channel (may be different from schedule's default)
      const { error: insertError } = await supabase
        .from('publish_queue')
        .insert({
          user_id: schedule.user_id,
          scraped_video_id: video.id,
          youtube_channel_id: targetChannelId,
          schedule_id: schedule.id,
          scheduled_for: new Date().toISOString(),
          status: 'queued',
        });

      if (insertError) {
        console.error(`Failed to queue video for schedule "${schedule.schedule_name}":`, insertError);
        scheduleDebug.status = 'error';
        scheduleDebug.reason = `Queue insert error: ${insertError.message}`;
        debugLog.push(scheduleDebug);
        continue;
      }

      console.log(`✓ Queued video ${video.id} for schedule "${schedule.schedule_name}" -> channel ${targetChannelId}`);
      scheduleDebug.status = 'queued';
      scheduleDebug.queuedVideoId = video.id;
      scheduleDebug.targetChannelId = targetChannelId;
      debugLog.push(scheduleDebug);
      queued++;
    }

    console.log('\n=== Schedule Processor Complete ===');
    console.log(`Summary: ${queued} queued (${rotated} rotated), ${skipped} skipped (not time), ${quotaSkipped} skipped (quota), ${schedules.length - queued - skipped - quotaSkipped} other`);
    console.log('Debug log:', JSON.stringify(debugLog, null, 2));

    return new Response(JSON.stringify({
      success: true,
      queued,
      rotated,
      skipped,
      quotaSkipped,
      totalSchedules: schedules.length,
      debugLog,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in schedule-processor:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
