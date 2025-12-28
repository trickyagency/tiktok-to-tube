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

    for (const schedule of schedules) {
      const publishTimes = Array.isArray(schedule.publish_times) 
        ? schedule.publish_times 
        : JSON.parse(schedule.publish_times || '[]');
      
      const timezone = schedule.timezone || 'UTC';

      // Check if current time matches any publish time
      if (!isTimeToPublish(publishTimes, timezone)) {
        console.log(`Schedule "${schedule.schedule_name}" - not time to publish`);
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
        continue;
      }

      if (!unpublishedVideos || unpublishedVideos.length === 0) {
        console.log(`No unpublished videos for schedule "${schedule.schedule_name}"`);
        continue;
      }

      // Find a video that isn't already queued/processing/published
      for (const video of unpublishedVideos) {
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
          
          // If it was published, sync the scraped_videos table
          if (existingQueue.status === 'published') {
            await supabase
              .from('scraped_videos')
              .update({ is_published: true })
              .eq('id', video.id);
          }
          continue;
        }

        // Found a valid video
        selectedVideo = video;
        break;
      }

      if (!selectedVideo) {
        console.log(`No available videos for schedule "${schedule.schedule_name}" (all already queued/published)`);
        continue;
      }

      const video = selectedVideo;

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
        continue;
      }

      console.log(`Queued video ${video.id} for schedule "${schedule.schedule_name}"`);
      queued++;
    }

    console.log(`=== Schedule Processor Complete: ${queued} queued, ${skipped} skipped ===`);

    return new Response(JSON.stringify({
      success: true,
      queued,
      skipped,
      totalSchedules: schedules.length,
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
