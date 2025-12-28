import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApifyVideoData {
  videoUrl: string;
  postDate: string;
  videoDuration: number;
  videoDescription: string;
  diggCount?: number;
  commentCount?: number;
  shareCount?: number;
  playCount?: number;
  coverUrl?: string;
  id?: string;
  // Additional download URL fields that Apify scrapers may provide
  downloadUrl?: string;
  videoUrlNoWaterMark?: string;
  videoPlayUrl?: string;
  downloadAddr?: string;
  // Author/profile metadata
  authorMeta?: {
    avatar?: string;
    fans?: number;
    following?: number;
    nickname?: string;
    name?: string;
  };
  // Alternative profile fields from different scraper versions
  authorAvatar?: string;
  authorName?: string;
  authorNickname?: string;
  authorFans?: number;
  authorFollowing?: number;
}

// Extract video ID from TikTok URL
function extractVideoId(videoUrl: string): string | null {
  const match = videoUrl.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

// Fetch the Apify API key from platform_settings
async function getApifyApiKey(supabase: any): Promise<string | null> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'apify_api_key')
    .single();
  
  if (error || !data?.value) {
    console.error('Failed to fetch Apify API key:', error);
    return null;
  }
  
  return data.value;
}

// Fetch dataset items from Apify
async function fetchDatasetItems(apiKey: string, datasetId: string): Promise<ApifyVideoData[]> {
  try {
    const response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch dataset items:', response.status);
      return [];
    }

    const data = await response.json();
    console.log(`Fetched ${data.length} items from dataset`);
    return data as ApifyVideoData[];
  } catch (error) {
    console.error('Error fetching dataset items:', error);
    return [];
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Parse the webhook payload from Apify
    const payload = await req.json();
    console.log('[Webhook] Received payload:', JSON.stringify(payload));

    // Apify sends different event types - we care about ACTOR.RUN.SUCCEEDED
    const eventType = payload.eventType;
    const runId = payload.eventData?.actorRunId || payload.resource?.id;
    const status = payload.eventData?.status || payload.resource?.status;

    console.log(`[Webhook] Event: ${eventType}, Run ID: ${runId}, Status: ${status}`);

    if (!runId) {
      console.error('[Webhook] No run ID found in payload');
      return new Response(
        JSON.stringify({ error: 'No run ID in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up the run in our database
    const { data: runRecord, error: runError } = await supabase
      .from('apify_runs')
      .select('*, tiktok_accounts(*)')
      .eq('run_id', runId)
      .single();

    if (runError || !runRecord) {
      console.error('[Webhook] Run not found in database:', runId, runError);
      return new Response(
        JSON.stringify({ error: 'Run not found', runId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountId = runRecord.tiktok_account_id;
    const userId = runRecord.user_id;

    console.log(`[Webhook] Found run for account ${accountId}`);

    // Handle different statuses
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      console.error(`[Webhook] Actor run failed: ${status}`);
      
      await supabase.from('apify_runs').update({
        status: 'failed',
        error_message: `Actor run ${status}`,
        completed_at: new Date().toISOString(),
      }).eq('id', runRecord.id);

      await supabase.from('tiktok_accounts').update({
        scrape_status: 'failed',
        updated_at: new Date().toISOString(),
      }).eq('id', accountId);

      return new Response(
        JSON.stringify({ success: true, message: 'Run failure recorded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (status !== 'SUCCEEDED') {
      console.log(`[Webhook] Ignoring non-completion status: ${status}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Status acknowledged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the dataset ID from the run details
    const datasetId = payload.resource?.defaultDatasetId || payload.eventData?.defaultDatasetId;
    
    if (!datasetId) {
      console.error('[Webhook] No dataset ID in successful run');
      await supabase.from('apify_runs').update({
        status: 'failed',
        error_message: 'No dataset ID returned',
        completed_at: new Date().toISOString(),
      }).eq('id', runRecord.id);

      await supabase.from('tiktok_accounts').update({
        scrape_status: 'failed',
        updated_at: new Date().toISOString(),
      }).eq('id', accountId);

      return new Response(
        JSON.stringify({ error: 'No dataset ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Webhook] Processing dataset: ${datasetId}`);

    // Get API key
    const apiKey = await getApifyApiKey(supabase);
    if (!apiKey) {
      console.error('[Webhook] No Apify API key configured');
      await supabase.from('apify_runs').update({
        status: 'failed',
        error_message: 'Apify API key not configured',
        completed_at: new Date().toISOString(),
      }).eq('id', runRecord.id);

      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch videos from dataset
    const videos = await fetchDatasetItems(apiKey, datasetId);
    console.log(`[Webhook] Fetched ${videos.length} videos`);

    // Filter valid videos (with duration > 0)
    const validVideos = videos.filter(video => {
      const duration = video.videoDuration;
      if (duration === null || duration === undefined || duration === 0) {
        return false;
      }
      return true;
    });
    console.log(`[Webhook] Valid videos: ${validVideos.length}`);

    if (validVideos.length === 0) {
      await supabase.from('apify_runs').update({
        status: 'completed',
        dataset_id: datasetId,
        videos_imported: 0,
        completed_at: new Date().toISOString(),
      }).eq('id', runRecord.id);

      await supabase.from('tiktok_accounts').update({
        scrape_status: 'completed',
        last_scraped_at: new Date().toISOString(),
        scrape_progress_current: 0,
        scrape_progress_total: 0,
        updated_at: new Date().toISOString(),
      }).eq('id', accountId);

      return new Response(
        JSON.stringify({ success: true, message: 'No new videos found', imported: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing video IDs
    const { data: existingVideos } = await supabase
      .from('scraped_videos')
      .select('tiktok_video_id')
      .eq('tiktok_account_id', accountId);

    const existingVideoIds = new Set(existingVideos?.map((v: any) => v.tiktok_video_id) || []);

    // Map and filter new videos
    const newVideos = validVideos
      .map(video => {
        const videoId = extractVideoId(video.videoUrl);
        if (!videoId || existingVideoIds.has(videoId)) return null;

        // Try to get the best download URL (direct video file, not TikTok page)
        const downloadUrl = video.downloadUrl 
          || video.videoUrlNoWaterMark 
          || video.videoPlayUrl 
          || video.downloadAddr
          || video.videoUrl; // Fallback to page URL if no direct URL available

        return {
          user_id: userId,
          tiktok_account_id: accountId,
          tiktok_video_id: videoId,
          title: video.videoDescription?.substring(0, 255) || null,
          description: video.videoDescription || null,
          video_url: video.videoUrl,
          thumbnail_url: video.coverUrl || null,
          download_url: downloadUrl,
          duration: video.videoDuration || 0,
          view_count: video.playCount || 0,
          like_count: video.diggCount || 0,
          comment_count: video.commentCount || 0,
          share_count: video.shareCount || 0,
          scraped_at: video.postDate || new Date().toISOString(),
          is_published: false,
        };
      })
      .filter(Boolean);

    console.log(`[Webhook] New videos to insert: ${newVideos.length}`);

    // Update progress total
    if (newVideos.length > 0) {
      await supabase.from('tiktok_accounts').update({
        scrape_progress_total: newVideos.length,
        scrape_progress_current: 0,
      }).eq('id', accountId);
    }

    // Batch insert videos
    let importedCount = 0;
    for (let i = 0; i < newVideos.length; i += 100) {
      const batch = newVideos.slice(i, i + 100);
      const { error: insertError } = await supabase
        .from('scraped_videos')
        .insert(batch);

      if (insertError) {
        console.error('[Webhook] Insert error:', insertError);
      } else {
        importedCount += batch.length;
      }

      // Update progress
      await supabase.from('tiktok_accounts').update({
        scrape_progress_current: Math.min(i + batch.length, newVideos.length),
      }).eq('id', accountId);
    }

    // Mark run and account as completed
    await supabase.from('apify_runs').update({
      status: 'completed',
      dataset_id: datasetId,
      videos_imported: importedCount,
      completed_at: new Date().toISOString(),
    }).eq('id', runRecord.id);

    // Extract profile data from the first video item (contains author metadata)
    const profileData = validVideos[0];
    const avatarUrl = profileData?.authorMeta?.avatar 
      || profileData?.authorAvatar 
      || null;
    const followerCount = profileData?.authorMeta?.fans 
      || profileData?.authorFans 
      || 0;
    const followingCount = profileData?.authorMeta?.following 
      || profileData?.authorFollowing 
      || 0;
    const displayName = profileData?.authorMeta?.nickname 
      || profileData?.authorMeta?.name
      || profileData?.authorNickname
      || profileData?.authorName
      || null;

    console.log(`[Webhook] Profile data - avatar: ${!!avatarUrl}, followers: ${followerCount}, name: ${displayName}`);

    await supabase.from('tiktok_accounts').update({
      scrape_status: 'completed',
      last_scraped_at: new Date().toISOString(),
      video_count: validVideos.length,
      scrape_progress_current: newVideos.length,
      scrape_progress_total: newVideos.length,
      updated_at: new Date().toISOString(),
      // Profile data from scraped videos
      ...(avatarUrl && { avatar_url: avatarUrl }),
      ...(followerCount > 0 && { follower_count: followerCount }),
      ...(followingCount > 0 && { following_count: followingCount }),
      ...(displayName && { display_name: displayName }),
    }).eq('id', accountId);

    console.log(`[Webhook] Completed! Imported ${importedCount} videos`);

    return new Response(
      JSON.stringify({ success: true, imported: importedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
