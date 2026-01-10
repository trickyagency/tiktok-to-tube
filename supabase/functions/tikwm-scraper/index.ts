import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Declare EdgeRuntime for background task processing
declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TikWMUserInfo {
  id: string;
  uniqueId: string;
  nickname: string;
  avatarLarger: string;
  signature: string;
  followerCount: number;
  followingCount: number;
  videoCount: number;
  secUid: string;
}

interface TikTokVideo {
  id: string;
  title: string;
  duration: number;
  cover: string;
  play: string;
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  create_time: number;
}

// Timeout wrapper for fetch requests
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// Fetch user info from TikWM
async function fetchUserInfo(username: string): Promise<TikWMUserInfo | null> {
  try {
    const response = await fetchWithTimeout('https://www.tikwm.com/api/user/info', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: `unique_id=${encodeURIComponent(username)}`,
    }, 10000);
    
    const data = await response.json();
    console.log('TikWM user info response code:', data.code);
    
    if (data.code === 0 && data.data) {
      const user = data.data.user;
      const stats = data.data.stats;
      return {
        id: user.id,
        uniqueId: user.uniqueId,
        nickname: user.nickname,
        avatarLarger: user.avatarLarger,
        signature: user.signature,
        followerCount: stats.followerCount,
        followingCount: stats.followingCount,
        videoCount: stats.videoCount,
        secUid: user.secUid,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
}

// Fetch single video info from TikWM
async function fetchSingleVideoInfo(videoUrl: string): Promise<TikTokVideo | null> {
  try {
    console.log('Fetching single video:', videoUrl);
    
    const response = await fetchWithTimeout('https://www.tikwm.com/api/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: `url=${encodeURIComponent(videoUrl)}&hd=1`,
    }, 15000);
    
    const data = await response.json();
    console.log('TikWM single video response code:', data.code);
    
    if (data.code === 0 && data.data) {
      const video = data.data;
      return {
        id: video.id,
        title: video.title || '',
        duration: video.duration || 0,
        cover: video.cover || video.origin_cover || '',
        play: video.hdplay || video.play || '',
        play_count: video.play_count || 0,
        digg_count: video.digg_count || 0,
        comment_count: video.comment_count || 0,
        share_count: video.share_count || 0,
        create_time: video.create_time || 0,
      };
    }
    console.log('TikWM single video failed:', data.msg);
    return null;
  } catch (error) {
    console.error('Error fetching single video:', error);
    return null;
  }
}

// Fetch videos using TikWM API - optimized for speed
async function fetchVideosFromTikWM(secUid: string, username: string, onProgress?: (current: number, total: number) => void): Promise<TikTokVideo[]> {
  const allVideos: TikTokVideo[] = [];
  let cursor = 0;
  let attempts = 0;
  const maxAttempts = 5;
  const maxVideos = 300; // Increased limit
  const batchSize = 50; // Increased batch size

  console.log(`Fetching videos for ${username} using TikWM API (optimized)`);

  while (attempts < maxAttempts && allVideos.length < maxVideos) {
    try {
      const response = await fetchWithTimeout('https://www.tikwm.com/api/user/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: `sec_uid=${encodeURIComponent(secUid)}&count=${batchSize}&cursor=${cursor}`,
      }, 15000);

      if (response.status !== 200) {
        console.log(`TikWM posts failed: status=${response.status}`);
        break;
      }

      const data = await response.json();
      
      if (data.code === 0 && data.data?.videos && data.data.videos.length > 0) {
        console.log(`TikWM returned ${data.data.videos.length} videos (total: ${allVideos.length + data.data.videos.length})`);
        
        for (const video of data.data.videos) {
          allVideos.push({
            id: video.video_id || video.id,
            title: video.title || '',
            duration: video.duration || 0,
            cover: video.cover || video.origin_cover || '',
            play: video.play || video.wmplay || '',
            play_count: video.play_count || 0,
            digg_count: video.digg_count || 0,
            comment_count: video.comment_count || 0,
            share_count: video.share_count || 0,
            create_time: video.create_time || 0,
          });
        }

        // Report progress if callback provided
        if (onProgress) {
          onProgress(allVideos.length, maxVideos);
        }

        if (!data.data.hasMore || data.data.videos.length < batchSize) break;
        cursor = data.data.cursor || (cursor + batchSize);
        // Reduced delay from 1500ms to 500ms for faster scraping
        await new Promise(r => setTimeout(r, 500));
      } else {
        console.log(`TikWM posts API: code=${data.code}, msg=${data.msg}`);
        break;
      }
    } catch (error) {
      console.error('TikWM posts error:', error);
      attempts++;
      // Brief delay before retry
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return allVideos;
}

// Main video fetching function with progress callback
async function fetchAllVideos(secUid: string, username: string, onProgress?: (current: number, total: number) => void): Promise<TikTokVideo[]> {
  console.log('Trying TikWM video scraping (optimized)...');
  const videos = await fetchVideosFromTikWM(secUid, username, onProgress);
  console.log(`TikWM returned ${videos.length} videos`);
  return videos;
}

// Background scraping function
async function scrapeVideosInBackground(
  supabase: any,
  accountId: string,
  accountOwnerId: string,
  scrapingUserId: string,
  userInfo: TikWMUserInfo,
  cleanUsername: string
) {
  console.log(`[Background] Starting video scrape for ${cleanUsername}`);
  
  try {
    // Update progress
    const updateProgress = async (current: number, total: number) => {
      await supabase
        .from('tiktok_accounts')
        .update({
          scrape_progress_current: current,
          scrape_progress_total: total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);
    };

    // Fetch videos with progress updates
    const videos = await fetchAllVideos(userInfo.secUid, cleanUsername, updateProgress);
    console.log(`[Background] Fetched ${videos.length} videos`);

    // Detect private accounts: API returns profile info but no videos when account claims to have videos
    if (videos.length === 0 && userInfo.videoCount > 0) {
      console.log(`[Background] Account ${cleanUsername} appears to be private - claims ${userInfo.videoCount} videos but fetched 0`);
      await supabase
        .from('tiktok_accounts')
        .update({
          scrape_status: 'completed',
          account_status: 'private',
          last_scraped_at: new Date().toISOString(),
          scrape_progress_current: 0,
          scrape_progress_total: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);
      return;
    }

    if (videos.length > 0) {
      // Get existing video IDs
      const { data: existingVideos } = await supabase
        .from('scraped_videos')
        .select('tiktok_video_id')
        .eq('tiktok_account_id', accountId);

      const existingVideoIds = new Set(existingVideos?.map((v: any) => v.tiktok_video_id) || []);
      const newVideos = videos.filter(v => !existingVideoIds.has(v.id));
      console.log(`[Background] New videos to insert: ${newVideos.length}`);

      // Batch insert new videos (increased batch size to 200)
      if (newVideos.length > 0) {
        const videosToInsert = newVideos.map(video => ({
          user_id: accountOwnerId, // Use TikTok account owner's ID, not the scraping user
          tiktok_account_id: accountId,
          tiktok_video_id: video.id,
          title: video.title || null,
          description: video.title || null,
          video_url: `https://www.tiktok.com/@${cleanUsername}/video/${video.id}`,
          thumbnail_url: video.cover,
          download_url: video.play,
          duration: video.duration,
          view_count: video.play_count || 0,
          like_count: video.digg_count || 0,
          comment_count: video.comment_count || 0,
          share_count: video.share_count || 0,
          scraped_at: new Date().toISOString(),
        }));

        for (let i = 0; i < videosToInsert.length; i += 200) {
          const batch = videosToInsert.slice(i, i + 200);
          const { error: insertError } = await supabase
            .from('scraped_videos')
            .insert(batch);
          
          if (insertError) {
            console.error('[Background] Error inserting videos batch:', insertError);
          }
          
          // Update progress
          await updateProgress(Math.min(i + 200, videosToInsert.length), videosToInsert.length);
        }
      // Send notification email if owner scraped for another user and new videos were imported
        if (scrapingUserId !== accountOwnerId && newVideos.length > 0) {
          console.log(`[Background] Owner scrape detected: sending notification to ${accountOwnerId}`);
          try {
            // Check if scraping user is owner
            const { data: scrapingUserRole } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', scrapingUserId)
              .single();

            if (scrapingUserRole?.role === 'owner') {
              // Call the notification edge function
              const notifyResponse = await fetch(
                `${Deno.env.get('SUPABASE_URL')}/functions/v1/scrape-notification`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  },
                  body: JSON.stringify({
                    accountOwnerId,
                    username: cleanUsername,
                    videosImported: newVideos.length,
                  }),
                }
              );
              
              if (!notifyResponse.ok) {
                console.error('[Background] Failed to send notification:', await notifyResponse.text());
              } else {
                console.log('[Background] Notification email sent successfully');
              }
            }
          } catch (notifyError) {
            console.error('[Background] Error sending notification:', notifyError);
          }
        }
      }
    }

    // Mark as completed with active status (we successfully fetched videos)
    await supabase
      .from('tiktok_accounts')
      .update({
        scrape_status: 'completed',
        account_status: 'active',
        last_scraped_at: new Date().toISOString(),
        scrape_progress_current: videos.length,
        scrape_progress_total: videos.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    console.log(`[Background] Scraping completed for ${cleanUsername}: ${videos.length} videos`);
  } catch (error) {
    console.error('[Background] Scraping error:', error);
    await supabase
      .from('tiktok_accounts')
      .update({
        scrape_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);
  }
}

// Helper to update account status safely
async function updateAccountStatus(
  supabase: any,
  accountId: string,
  status: 'pending' | 'scraping' | 'completed' | 'failed',
  extraData: Record<string, any> = {}
) {
  try {
    const { error } = await supabase
      .from('tiktok_accounts')
      .update({
        scrape_status: status,
        updated_at: new Date().toISOString(),
        ...extraData,
      })
      .eq('id', accountId);
    
    if (error) {
      console.error('Failed to update account status:', error);
    }
  } catch (e) {
    console.error('Error updating account status:', e);
  }
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

    const body = await req.json();
    const { username, accountId: providedAccountId, videoUrl, tiktokAccountId } = body;

    // =============== SINGLE VIDEO IMPORT MODE ===============
    if (videoUrl && tiktokAccountId) {
      console.log(`Single video import: ${videoUrl} for account ${tiktokAccountId}`);
      
      // Verify the account belongs to the user
      const { data: account, error: accountError } = await supabase
        .from('tiktok_accounts')
        .select('id, username')
        .eq('id', tiktokAccountId)
        .eq('user_id', user.id)
        .single();
      
      if (accountError || !account) {
        return new Response(
          JSON.stringify({ error: 'TikTok account not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch video info
      const videoInfo = await fetchSingleVideoInfo(videoUrl);
      
      if (!videoInfo) {
        return new Response(
          JSON.stringify({ error: 'Could not fetch video info. The video may be private or deleted.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if video already exists
      const { data: existingVideo } = await supabase
        .from('scraped_videos')
        .select('id')
        .eq('tiktok_account_id', tiktokAccountId)
        .eq('tiktok_video_id', videoInfo.id)
        .single();

      if (existingVideo) {
        return new Response(
          JSON.stringify({ error: 'This video has already been imported' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert the video
      const { data: newVideo, error: insertError } = await supabase
        .from('scraped_videos')
        .insert({
          user_id: user.id,
          tiktok_account_id: tiktokAccountId,
          tiktok_video_id: videoInfo.id,
          title: videoInfo.title || null,
          description: videoInfo.title || null,
          video_url: videoUrl,
          thumbnail_url: videoInfo.cover,
          download_url: videoInfo.play,
          duration: videoInfo.duration,
          view_count: videoInfo.play_count || 0,
          like_count: videoInfo.digg_count || 0,
          comment_count: videoInfo.comment_count || 0,
          share_count: videoInfo.share_count || 0,
          scraped_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting video:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save video' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Single video imported successfully:', videoInfo.id);
      return new Response(
        JSON.stringify({
          success: true,
          video: {
            id: newVideo.id,
            title: videoInfo.title,
            view_count: videoInfo.play_count,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =============== FULL ACCOUNT SCRAPE MODE ===============
    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting scrape for username: ${username}, user: ${user.id}`);
    const cleanUsername = username.replace(/^@/, '').trim();

    // Fetch user info
    const userInfo = await fetchUserInfo(cleanUsername);
    
    if (!userInfo) {
      return new Response(
        JSON.stringify({ error: 'TikTok user not found or account is private' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Insert or update the account
    const accountData = {
      user_id: user.id,
      username: cleanUsername,
      display_name: userInfo.nickname,
      avatar_url: userInfo.avatarLarger,
      follower_count: userInfo.followerCount,
      following_count: userInfo.followingCount,
      video_count: userInfo.videoCount,
      scrape_status: 'scraping',
      updated_at: new Date().toISOString(),
    };

    let account;
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

    // Get the TikTok account owner's user_id (for cases where admin scrapes on behalf of user)
    const accountOwnerId = account.user_id || user.id;
    console.log(`Account owner ID: ${accountOwnerId}, Scraping user ID: ${user.id}`);

    // Start background scraping using EdgeRuntime.waitUntil
    // This allows us to return immediately while scraping continues
    EdgeRuntime.waitUntil(
      scrapeVideosInBackground(supabase, account.id, accountOwnerId, user.id, userInfo, cleanUsername)
    );

    // Return immediate response - scraping continues in background
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scraping started! Videos will appear as they are fetched.',
        background: true,
        account: {
          id: account.id,
          username: cleanUsername,
          display_name: userInfo.nickname,
          profile_video_count: userInfo.videoCount,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scraper error:', error);
    
    // If we have an account ID, make sure to reset status so it's not stuck
    if (accountId) {
      await updateAccountStatus(supabase, accountId, 'failed');
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
