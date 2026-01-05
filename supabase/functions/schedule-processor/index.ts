import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

// Validate that schedule, video, and channel all belong to the same user
async function validateScheduleOwnership(
  supabase: any,
  schedule: any,
  video: any
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
    .eq('id', schedule.youtube_channel_id)
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
    const debugLog: any[] = [];

    for (const schedule of schedules) {
      const scheduleDebug: any = {
        scheduleId: schedule.id,
        scheduleName: schedule.schedule_name,
        scheduleUserId: schedule.user_id,
        tiktokAccountId: schedule.tiktok_account_id,
        youtubeChannelId: schedule.youtube_channel_id,
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

      // Get unpublished videos from the linked TikTok account, try to find one that hasn't been uploaded
      let selectedVideo = null;
      const { data: unpublishedVideos, error: videosError } = await supabase
        .from('scraped_videos')
        .select('*')
        .eq('tiktok_account_id', schedule.tiktok_account_id)
        .eq('is_published', false)
        .order('scraped_at', { ascending: true })
        .limit(10); // Get more to find a valid one

      if (videosError) {
        console.error(`Error fetching videos for schedule "${schedule.schedule_name}":`, videosError);
        scheduleDebug.status = 'error';
        scheduleDebug.reason = `Video fetch error: ${videosError.message}`;
        debugLog.push(scheduleDebug);
        continue;
      }

      console.log(`Fetched ${unpublishedVideos?.length || 0} unpublished videos for account ${schedule.tiktok_account_id}`);
      
      // Log first few videos for debugging
      if (unpublishedVideos && unpublishedVideos.length > 0) {
        console.log('Sample videos (first 3):');
        unpublishedVideos.slice(0, 3).forEach((v, i) => {
          console.log(`  [${i + 1}] Video ID: ${v.id}, user_id: ${v.user_id}, tiktok_video_id: ${v.tiktok_video_id}`);
        });
      }

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
        
        // Check if video is already in queue (queued, processing, OR published)
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
          
          // If it was published, sync the scraped_videos table
          if (existingQueue.status === 'published') {
            await supabase
              .from('scraped_videos')
              .update({ is_published: true })
              .eq('id', video.id);
          }
          continue;
        }

        // IMPORTANT: Check ownership BEFORE selecting the video
        // Log detailed ownership check info
        console.log(`Ownership check for video ${video.id}:`);
        console.log(`  - Schedule user_id: ${schedule.user_id}`);
        console.log(`  - Video user_id: ${video.user_id}`);
        console.log(`  - Match: ${schedule.user_id === video.user_id}`);

        // Pre-validate ownership before full check
        if (video.user_id !== schedule.user_id) {
          console.warn(`OWNERSHIP MISMATCH: Video ${video.id} belongs to user ${video.user_id}, but schedule belongs to user ${schedule.user_id}`);
          ownershipFailed++;
          continue;
        }

        // Found a valid video
        selectedVideo = video;
        break;
      }

      scheduleDebug.videosChecked = videosChecked;
      scheduleDebug.videosAlreadyQueued = videosAlreadyQueued;
      scheduleDebug.ownershipFailed = ownershipFailed;

      if (!selectedVideo) {
        console.log(`No available videos for schedule "${schedule.schedule_name}"`);
        console.log(`  Checked: ${videosChecked}, Already queued: ${videosAlreadyQueued}, Ownership failed: ${ownershipFailed}`);
        scheduleDebug.status = 'skipped';
        scheduleDebug.reason = `No valid videos: ${videosChecked} checked, ${videosAlreadyQueued} already queued, ${ownershipFailed} ownership mismatch`;
        debugLog.push(scheduleDebug);
        continue;
      }

      const video = selectedVideo;
      console.log(`Selected video: ${video.id} (tiktok_video_id: ${video.tiktok_video_id})`);

      // SECURITY: Validate that schedule, video, and channel all belong to the same user
      const ownershipCheck = await validateScheduleOwnership(supabase, schedule, video);
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
        
        // Update the video with the new download URL
        await supabase
          .from('scraped_videos')
          .update({ download_url: downloadUrl })
          .eq('id', video.id);
          
        console.log(`Updated download URL for video ${video.id}`);
      } catch (tikwmError) {
        console.error(`TikWM fetch failed for video ${video.id}:`, tikwmError);
        // Continue with existing download URL if available
        if (!downloadUrl) {
          console.error(`No download URL available for video ${video.id}, skipping`);
          scheduleDebug.status = 'error';
          scheduleDebug.reason = 'No download URL available';
          debugLog.push(scheduleDebug);
          continue;
        }
      }

      // Add to publish queue
      const { error: insertError } = await supabase
        .from('publish_queue')
        .insert({
          user_id: schedule.user_id,
          scraped_video_id: video.id,
          youtube_channel_id: schedule.youtube_channel_id,
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

      console.log(`✓ Queued video ${video.id} for schedule "${schedule.schedule_name}"`);
      scheduleDebug.status = 'queued';
      scheduleDebug.queuedVideoId = video.id;
      debugLog.push(scheduleDebug);
      queued++;
    }

    console.log('\n=== Schedule Processor Complete ===');
    console.log(`Summary: ${queued} queued, ${skipped} skipped (not time), ${schedules.length - queued - skipped} other`);
    console.log('Debug log:', JSON.stringify(debugLog, null, 2));

    return new Response(JSON.stringify({
      success: true,
      queued,
      skipped,
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
