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

// Start an Apify actor run
async function startActorRun(apiKey: string, username: string): Promise<{ runId: string } | null> {
  try {
    const response = await fetch('https://api.apify.com/v2/acts/tKV6oSrYXiKNXXNy6/runs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Urls: [`https://www.tiktok.com/@${username}`],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to start Apify actor:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Apify actor started:', data.data?.id);
    return { runId: data.data?.id };
  } catch (error) {
    console.error('Error starting Apify actor:', error);
    return null;
  }
}

// Poll for actor run completion
async function waitForActorCompletion(apiKey: string, runId: string, maxWaitMs: number = 300000): Promise<string | null> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to check actor status:', response.status);
        await new Promise(r => setTimeout(r, pollInterval));
        continue;
      }

      const data = await response.json();
      const status = data.data?.status;
      console.log(`Actor run ${runId} status: ${status}`);

      if (status === 'SUCCEEDED') {
        return data.data?.defaultDatasetId;
      } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        console.error(`Actor run failed with status: ${status}`);
        return null;
      }

      await new Promise(r => setTimeout(r, pollInterval));
    } catch (error) {
      console.error('Error polling actor status:', error);
      await new Promise(r => setTimeout(r, pollInterval));
    }
  }

  console.error('Actor run timed out');
  return null;
}

// Fetch dataset items
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

// Background task to complete the scraping process
async function processScrapingInBackground(
  supabase: any,
  apiKey: string,
  runId: string,
  accountId: string,
  userId: string,
  cleanUsername: string
) {
  console.log(`[Background] Starting background processing for account ${accountId}, run ${runId}`);
  
  try {
    // Wait for actor to complete
    const datasetId = await waitForActorCompletion(apiKey, runId);
    if (!datasetId) {
      console.error('[Background] Actor failed or timed out');
      await updateAccountStatus(supabase, accountId, 'failed');
      return;
    }

    // Fetch video data
    const videos = await fetchDatasetItems(apiKey, datasetId);
    console.log(`[Background] Fetched ${videos.length} videos from Apify`);

    // Filter out videos with 0 duration or no duration (images/slideshows)
    const validVideos = videos.filter(video => {
      const duration = video.videoDuration;
      if (duration === null || duration === undefined || duration === 0) {
        console.log(`[Background] Skipping video (no duration/image): ${video.videoUrl}`);
        return false;
      }
      return true;
    });
    console.log(`[Background] Valid videos after filtering: ${validVideos.length}`);

    if (validVideos.length === 0) {
      await updateAccountStatus(supabase, accountId, 'completed', {
        last_scraped_at: new Date().toISOString(),
        video_count: 0,
      });
      console.log('[Background] No valid videos found');
      return;
    }

    // Get existing video IDs for this account
    const { data: existingVideos } = await supabase
      .from('scraped_videos')
      .select('tiktok_video_id')
      .eq('tiktok_account_id', accountId);

    const existingVideoIds = new Set(existingVideos?.map((v: any) => v.tiktok_video_id) || []);

    // Get already published video IDs (to skip re-importing)
    const { data: publishedVideos } = await supabase
      .from('scraped_videos')
      .select('tiktok_video_id')
      .eq('tiktok_account_id', accountId)
      .eq('is_published', true);

    const publishedVideoIds = new Set(publishedVideos?.map((v: any) => v.tiktok_video_id) || []);
    console.log(`[Background] Already published videos: ${publishedVideoIds.size}`);

    // Map and filter new videos
    const newVideos = validVideos
      .map(video => {
        const videoId = extractVideoId(video.videoUrl);
        if (!videoId) return null;
        
        if (existingVideoIds.has(videoId)) return null;
        if (publishedVideoIds.has(videoId)) return null;

        return {
          user_id: userId,
          tiktok_account_id: accountId,
          tiktok_video_id: videoId,
          title: video.videoDescription?.substring(0, 255) || null,
          description: video.videoDescription || null,
          video_url: video.videoUrl,
          thumbnail_url: video.coverUrl || null,
          download_url: video.videoUrl,
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

    console.log(`[Background] New videos to insert: ${newVideos.length}`);

    // Set progress total before starting batch inserts
    if (newVideos.length > 0) {
      await supabase
        .from('tiktok_accounts')
        .update({
          scrape_progress_total: newVideos.length,
          scrape_progress_current: 0,
        })
        .eq('id', accountId);
    }

    // Batch insert new videos with progress updates
    if (newVideos.length > 0) {
      for (let i = 0; i < newVideos.length; i += 100) {
        const batch = newVideos.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from('scraped_videos')
          .insert(batch);
        
        if (insertError) {
          console.error('[Background] Error inserting videos batch:', insertError);
        }

        // Update progress after each batch
        const currentProgress = Math.min(i + batch.length, newVideos.length);
        await supabase
          .from('tiktok_accounts')
          .update({
            scrape_progress_current: currentProgress,
          })
          .eq('id', accountId);
        
        console.log(`[Background] Progress: ${currentProgress}/${newVideos.length}`);
      }
    }

    // Update account with video count and completion status
    await updateAccountStatus(supabase, accountId, 'completed', {
      last_scraped_at: new Date().toISOString(),
      video_count: validVideos.length,
    });

    console.log(`[Background] Completed! Inserted ${newVideos.length} new videos`);
  } catch (error) {
    console.error('[Background] Error:', error);
    await updateAccountStatus(supabase, accountId, 'failed');
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

    // Get Apify API key from platform_settings
    const apiKey = await getApifyApiKey(supabase);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Apify API key not configured. Please contact the platform owner.' }),
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
    console.log(`Starting Apify scrape for username: ${cleanUsername}, user: ${user.id}`);

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

    // Start Apify actor
    const runResult = await startActorRun(apiKey, cleanUsername);
    if (!runResult) {
      await updateAccountStatus(supabase, account.id, 'failed');
      return new Response(
        JSON.stringify({ error: 'Failed to start TikTok scraper. Please check your Apify API key and Actor subscription.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Apify actor started with run ID: ${runResult.runId}`);

    // Use EdgeRuntime.waitUntil to process in background
    // This allows us to return immediately while the scraping continues
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(
      processScrapingInBackground(
        supabase,
        apiKey,
        runResult.runId,
        account.id,
        user.id,
        cleanUsername
      )
    );

    // Return immediately - scraping will continue in background
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scraping started. Videos will appear shortly.',
        account: {
          id: account.id,
          username: cleanUsername,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Apify scraper error:', error);
    
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
