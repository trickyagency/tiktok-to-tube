import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIKAPI_URL = 'https://tikapi.digitalautomators.com/v1/scrape';
const SCRAPE_TIMEOUT_MS = 290_000; // 290 seconds (edge function max ~300s)

// Extract video ID from TikTok URL
function extractVideoId(videoUrl: string): string | null {
  const match = videoUrl.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

// Helper to update account status
async function updateAccountStatus(
  supabase: any,
  accountId: string,
  status: 'pending' | 'scraping' | 'completed' | 'failed',
  extraData: Record<string, any> = {}
) {
  try {
    await supabase
      .from('tiktok_accounts')
      .update({
        scrape_status: status,
        updated_at: new Date().toISOString(),
        ...extraData,
      })
      .eq('id', accountId);
  } catch (e) {
    console.error('Error updating account status:', e);
  }
}

// Try to map video data from the API response (auto-detect format)
function mapVideoData(item: any, accountId: string, accountOwnerId: string): any | null {
  // Try to extract video ID from various possible fields
  let videoId = item.id || item.video_id || item.tiktok_video_id;
  const videoUrl = item.videoUrl || item.video_url || item.url || '';

  if (!videoId && videoUrl) {
    videoId = extractVideoId(videoUrl);
  }

  if (!videoId) return null;

  // Filter out zero-duration items (images/slideshows)
  const duration = item.videoDuration || item.duration || item.video_duration || item.duration_seconds || 0;
  if (duration === 0) return null;

  // Get the best download URL
  const downloadUrl = item.downloadUrl
    || item.download_url
    || item.videoUrlNoWaterMark
    || item.videoPlayUrl
    || item.downloadAddr
    || videoUrl;

  return {
    user_id: accountOwnerId,
    tiktok_account_id: accountId,
    tiktok_video_id: String(videoId),
    title: (item.videoDescription || item.description || item.title || '').substring(0, 255) || null,
    description: item.videoDescription || item.description || null,
    video_url: videoUrl,
    thumbnail_url: item.coverUrl || item.thumbnail_url || item.cover || item.thumbnail || null,
    download_url: downloadUrl,
    duration: duration,
    view_count: item.playCount || item.view_count || item.views || 0,
    like_count: item.diggCount || item.like_count || item.likes || 0,
    comment_count: item.commentCount || item.comment_count || item.comments || 0,
    share_count: item.shareCount || item.share_count || item.shares || item.repost_count || 0,
    scraped_at: item.postDate || item.created_at || item.createTime || item.upload_date || new Date().toISOString(),
    is_published: false,
  };
}

// Extract profile data from response or first video
function extractProfileData(data: any): Record<string, any> {
  // Check if the response has top-level profile data
  const profile: Record<string, any> = {};

  const avatar = data.avatar_url || data.avatarUrl || data.authorMeta?.avatar || data.authorAvatar;
  if (avatar) profile.avatar_url = avatar;

  const followers = data.follower_count || data.followers || data.authorMeta?.fans || data.authorFans;
  if (followers && followers > 0) profile.follower_count = followers;

  const following = data.following_count || data.following || data.authorMeta?.following || data.authorFollowing;
  if (following && following > 0) profile.following_count = following;

  const displayName = data.display_name || data.nickname || data.authorMeta?.nickname || data.authorNickname;
  if (displayName) profile.display_name = displayName;

  return profile;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let accountId: string | null = null;

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get TikAPI key from secrets
    const apiKey = Deno.env.get('TIKAPI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Scraper API key not configured. Please contact the platform owner.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { username, accountId: providedAccountId } = body;

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanUsername = username.replace(/^@/, '').trim();
    console.log(`Starting TikAPI scrape for username: ${cleanUsername}, user: ${user.id}`);

    // Check for existing account
    accountId = providedAccountId;
    if (!accountId) {
      const { data: existingAccount } = await supabase
        .from('tiktok_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('username', cleanUsername)
        .single();

      if (existingAccount) {
        accountId = existingAccount.id;
      }
    }

    // Create or update account with scraping status
    const accountData = {
      user_id: user.id,
      username: cleanUsername,
      scrape_status: 'scraping',
      scrape_progress_current: 0,
      scrape_progress_total: 0,
      updated_at: new Date().toISOString(),
    };

    let account: any;
    if (accountId) {
      const { data, error } = await supabase
        .from('tiktok_accounts')
        .update(accountData)
        .eq('id', accountId)
        .select()
        .single();
      if (error) throw error;
      account = data;
    } else {
      const { data, error } = await supabase
        .from('tiktok_accounts')
        .insert(accountData)
        .select()
        .single();
      if (error) throw error;
      account = data;
      accountId = account.id;
    }

    console.log(`Account saved: ${account.id}`);

    // Call custom TikAPI
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
        body: JSON.stringify({ username: cleanUsername }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('TikAPI request timed out after', SCRAPE_TIMEOUT_MS, 'ms');
        await updateAccountStatus(supabase, account.id, 'failed');
        return new Response(
          JSON.stringify({ error: 'Scraping timed out. The API took too long to respond. Please try again.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('TikAPI error:', apiResponse.status, errorText);
      
      // Detect deleted/not found accounts from API error
      const errorLower = errorText.toLowerCase();
      const isDeletedOrNotFound = apiResponse.status === 404 || 
        errorLower.includes('not found') || 
        errorLower.includes('deleted') || 
        errorLower.includes('user not found') ||
        errorLower.includes('account not found') ||
        errorLower.includes('doesn\'t exist') ||
        errorLower.includes('does not exist');
      
      if (isDeletedOrNotFound) {
        console.log(`Account ${cleanUsername} detected as deleted/not found`);
        await supabase.from('tiktok_accounts').update({
          account_status: 'deleted',
          scrape_status: 'failed',
          updated_at: new Date().toISOString(),
        }).eq('id', account.id);
      } else {
        await updateAccountStatus(supabase, account.id, 'failed');
      }
      
      return new Response(
        JSON.stringify({ error: `Scraper API error (${apiResponse.status}): ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await apiResponse.json();
    console.log('[TikAPI] Response received, type:', typeof responseData, 'isArray:', Array.isArray(responseData));

    // Log first item structure for debugging format detection
    const sampleItem = Array.isArray(responseData) ? responseData[0] : responseData?.videos?.[0] || responseData?.data?.[0] || responseData?.items?.[0];
    if (sampleItem) {
      console.log('[TikAPI] Sample item keys:', Object.keys(sampleItem).join(', '));
    }

    // Extract videos array from response (auto-detect format)
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
      console.error('[TikAPI] Unable to extract videos from response. Keys:', Object.keys(responseData || {}).join(', '));
      await updateAccountStatus(supabase, account.id, 'failed');
      return new Response(
        JSON.stringify({ error: 'Unexpected response format from scraper API', keys: Object.keys(responseData || {}) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TikAPI] Raw videos: ${videosRaw.length}`);

    // Get the account owner ID (for proper video ownership)
    const { data: accountRecord } = await supabase
      .from('tiktok_accounts')
      .select('user_id')
      .eq('id', account.id)
      .single();
    const accountOwnerId = accountRecord?.user_id || user.id;

    // Map and filter videos
    const mappedVideos = videosRaw
      .map((item: any) => mapVideoData(item, account.id, accountOwnerId))
      .filter(Boolean);

    console.log(`[TikAPI] Mapped videos (after duration filter): ${mappedVideos.length}`);

    // Deduplicate against existing videos
    const { data: existingVideos } = await supabase
      .from('scraped_videos')
      .select('tiktok_video_id')
      .eq('tiktok_account_id', account.id);

    const existingIds = new Set(existingVideos?.map((v: any) => v.tiktok_video_id) || []);
    const newVideos = mappedVideos.filter((v: any) => !existingIds.has(v.tiktok_video_id));

    console.log(`[TikAPI] New videos to insert: ${newVideos.length} (${existingIds.size} already exist)`);

    // Update progress total
    if (newVideos.length > 0) {
      await supabase.from('tiktok_accounts').update({
        scrape_progress_total: newVideos.length,
        scrape_progress_current: 0,
      }).eq('id', account.id);
    }

    // Batch insert videos
    let importedCount = 0;
    for (let i = 0; i < newVideos.length; i += 100) {
      const batch = newVideos.slice(i, i + 100);
      const { error: insertError } = await supabase
        .from('scraped_videos')
        .insert(batch);

      if (insertError) {
        console.error('[TikAPI] Insert error:', insertError);
      } else {
        importedCount += batch.length;
      }

      // Update progress
      await supabase.from('tiktok_accounts').update({
        scrape_progress_current: Math.min(i + batch.length, newVideos.length),
      }).eq('id', account.id);
    }

    // Extract profile data from response
    const profileData = extractProfileData(responseData);

    // Mark as completed - reset account_status to active on successful scrape
    await supabase.from('tiktok_accounts').update({
      scrape_status: 'completed',
      account_status: 'active',
      last_scraped_at: new Date().toISOString(),
      video_count: mappedVideos.length,
      scrape_progress_current: newVideos.length,
      scrape_progress_total: newVideos.length,
      updated_at: new Date().toISOString(),
      ...profileData,
    }).eq('id', account.id);

    console.log(`[TikAPI] Completed! Imported ${importedCount} new videos`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Imported ${importedCount} new videos`,
        account: { id: account.id, username: cleanUsername },
        imported: importedCount,
        total: mappedVideos.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('TikAPI scraper error:', error);
    if (accountId) {
      await updateAccountStatus(supabase, accountId, 'failed');
    }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
