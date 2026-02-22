import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIKAPI_URL = 'https://tikapi.digitalautomators.com/v1/scrape';
const SCRAPE_TIMEOUT_MS = 280_000; // 280 seconds per account

// Extract video ID from TikTok URL
function extractVideoId(videoUrl: string): string | null {
  const match = videoUrl.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

function mapVideoData(item: any, accountId: string, accountOwnerId: string): any | null {
  let videoId = item.id || item.video_id || item.tiktok_video_id;
  const videoUrl = item.videoUrl || item.video_url || item.url || '';
  if (!videoId && videoUrl) videoId = extractVideoId(videoUrl);
  if (!videoId) return null;

  const duration = item.videoDuration || item.duration || item.video_duration || 0;
  if (duration === 0) return null;

  const downloadUrl = item.downloadUrl || item.download_url || item.videoUrlNoWaterMark
    || item.videoPlayUrl || item.downloadAddr || videoUrl;

  return {
    user_id: accountOwnerId,
    tiktok_account_id: accountId,
    tiktok_video_id: String(videoId),
    title: (item.videoDescription || item.description || item.title || '').substring(0, 255) || null,
    description: item.videoDescription || item.description || null,
    video_url: videoUrl,
    thumbnail_url: item.coverUrl || item.thumbnail_url || item.cover || null,
    download_url: downloadUrl,
    duration,
    view_count: item.playCount || item.view_count || item.views || 0,
    like_count: item.diggCount || item.like_count || item.likes || 0,
    comment_count: item.commentCount || item.comment_count || item.comments || 0,
    share_count: item.shareCount || item.share_count || item.shares || 0,
    scraped_at: item.postDate || item.created_at || item.createTime || new Date().toISOString(),
    is_published: false,
  };
}

async function processQueueItem(
  supabase: any,
  apiKey: string,
  queueItem: any
): Promise<{ success: boolean; error?: string }> {
  const { id: queueId, tiktok_account_id, user_id } = queueItem;

  try {
    // Mark as processing
    await supabase.from('scrape_queue').update({
      status: 'processing',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', queueId);

    // Get account info
    const { data: account, error: accountError } = await supabase
      .from('tiktok_accounts')
      .select('username, user_id')
      .eq('id', tiktok_account_id)
      .single();

    if (accountError || !account) {
      throw new Error(`Account not found: ${accountError?.message || 'unknown'}`);
    }

    const accountOwnerId = account.user_id || user_id;

    // Update account status to scraping
    await supabase.from('tiktok_accounts').update({
      scrape_status: 'scraping',
      scrape_progress_current: 0,
      scrape_progress_total: 0,
      updated_at: new Date().toISOString(),
    }).eq('id', tiktok_account_id);

    // Call TikAPI
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

    let apiResponse: Response;
    try {
      apiResponse = await fetch(TIKAPI_URL, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: account.username }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Scraping timed out. The API took too long to respond.');
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      
      // Detect deleted/not found accounts
      const errorLower = errorText.toLowerCase();
      const isDeletedOrNotFound = apiResponse.status === 404 || 
        errorLower.includes('not found') || 
        errorLower.includes('deleted') || 
        errorLower.includes('user not found') ||
        errorLower.includes('account not found') ||
        errorLower.includes('doesn\'t exist') ||
        errorLower.includes('does not exist');
      
      if (isDeletedOrNotFound) {
        console.log(`Account ${account.username} detected as deleted/not found`);
        await supabase.from('tiktok_accounts').update({
          account_status: 'deleted',
          scrape_status: 'failed',
          updated_at: new Date().toISOString(),
        }).eq('id', tiktok_account_id);
      }
      
      throw new Error(`Scraper API error (${apiResponse.status}): ${errorText}`);
    }

    const responseData = await apiResponse.json();

    // Extract videos array (auto-detect format)
    let videosRaw: any[] = [];
    if (Array.isArray(responseData)) {
      videosRaw = responseData;
    } else if (Array.isArray(responseData?.videos)) {
      videosRaw = responseData.videos;
    } else if (Array.isArray(responseData?.data)) {
      videosRaw = responseData.data;
    } else if (Array.isArray(responseData?.items)) {
      videosRaw = responseData.items;
    } else {
      throw new Error('Unexpected response format from scraper API');
    }

    // Map and filter
    const mappedVideos = videosRaw
      .map((item: any) => mapVideoData(item, tiktok_account_id, accountOwnerId))
      .filter(Boolean);

    // Deduplicate
    const { data: existingVideos } = await supabase
      .from('scraped_videos')
      .select('tiktok_video_id')
      .eq('tiktok_account_id', tiktok_account_id);

    const existingIds = new Set(existingVideos?.map((v: any) => v.tiktok_video_id) || []);
    const newVideos = mappedVideos.filter((v: any) => !existingIds.has(v.tiktok_video_id));

    // Update progress
    if (newVideos.length > 0) {
      await supabase.from('tiktok_accounts').update({
        scrape_progress_total: newVideos.length,
        scrape_progress_current: 0,
      }).eq('id', tiktok_account_id);
    }

    // Batch insert
    let importedCount = 0;
    for (let i = 0; i < newVideos.length; i += 100) {
      const batch = newVideos.slice(i, i + 100);
      const { error: insertError } = await supabase.from('scraped_videos').insert(batch);
      if (!insertError) importedCount += batch.length;

      await supabase.from('tiktok_accounts').update({
        scrape_progress_current: Math.min(i + batch.length, newVideos.length),
      }).eq('id', tiktok_account_id);
    }

    // Mark completed - reset account_status to active on successful scrape
    await supabase.from('tiktok_accounts').update({
      scrape_status: 'completed',
      account_status: 'active',
      last_scraped_at: new Date().toISOString(),
      video_count: mappedVideos.length,
      scrape_progress_current: newVideos.length,
      scrape_progress_total: newVideos.length,
      updated_at: new Date().toISOString(),
    }).eq('id', tiktok_account_id);

    await supabase.from('scrape_queue').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      videos_found: mappedVideos.length,
      videos_imported: importedCount,
      updated_at: new Date().toISOString(),
    }).eq('id', queueId);

    console.log(`Queue item ${queueId} done: imported ${importedCount} videos`);
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed queue item ${queueId}:`, errorMessage);

    const attempts = (queueItem.attempts || 0) + 1;
    const maxAttempts = queueItem.max_attempts || 3;

    await supabase.from('scrape_queue').update({
      status: attempts >= maxAttempts ? 'failed' : 'pending',
      attempts,
      error_message: errorMessage,
      scheduled_at: attempts < maxAttempts
        ? new Date(Date.now() + Math.pow(2, attempts) * 60000).toISOString()
        : undefined,
      updated_at: new Date().toISOString(),
    }).eq('id', queueId);

    if (attempts >= maxAttempts) {
      await supabase.from('tiktok_accounts').update({
        scrape_status: 'failed',
        updated_at: new Date().toISOString(),
      }).eq('id', tiktok_account_id);
    }

    return { success: false, error: errorMessage };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`Scrape queue processor started`);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const apiKey = Deno.env.get('TIKAPI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: true, message: 'Scraper API key not configured', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch pending queue items that are due
    const { data: queueItems, error: fetchError } = await supabase
      .from('scrape_queue')
      .select('id, tiktok_account_id, user_id, attempts, max_attempts, scheduled_at')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(5); // Process up to 5 in parallel

    if (fetchError) throw fetchError;

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending items', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${queueItems.length} queue items in parallel`);

    // Process all items in parallel
    const results = await Promise.allSettled(
      queueItems.map((item) => processQueueItem(supabase, apiKey, item))
    );

    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - succeeded;

    const duration = Date.now() - startTime;
    console.log(`Processing complete. ${succeeded} succeeded, ${failed} failed, Duration: ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: queueItems.length,
        succeeded,
        failed,
        durationMs: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scrape queue processor error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
