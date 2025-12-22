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
        JSON.stringify({ error: 'Failed to start TikTok scraper' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Wait for actor to complete
    const datasetId = await waitForActorCompletion(apiKey, runResult.runId);
    if (!datasetId) {
      await updateAccountStatus(supabase, account.id, 'failed');
      return new Response(
        JSON.stringify({ error: 'TikTok scraper failed or timed out' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch video data
    const videos = await fetchDatasetItems(apiKey, datasetId);
    console.log(`Fetched ${videos.length} videos from Apify`);

    if (videos.length === 0) {
      await updateAccountStatus(supabase, account.id, 'failed');
      return new Response(
        JSON.stringify({ error: 'No videos found for this account' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing video IDs
    const { data: existingVideos } = await supabase
      .from('scraped_videos')
      .select('tiktok_video_id')
      .eq('tiktok_account_id', account.id);

    const existingVideoIds = new Set(existingVideos?.map(v => v.tiktok_video_id) || []);

    // Map and filter new videos
    const newVideos = videos
      .map(video => {
        const videoId = extractVideoId(video.videoUrl);
        if (!videoId || existingVideoIds.has(videoId)) return null;

        return {
          user_id: user.id,
          tiktok_account_id: account.id,
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
        };
      })
      .filter(Boolean);

    console.log(`New videos to insert: ${newVideos.length}`);

    // Batch insert new videos
    if (newVideos.length > 0) {
      for (let i = 0; i < newVideos.length; i += 100) {
        const batch = newVideos.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from('scraped_videos')
          .insert(batch);
        
        if (insertError) {
          console.error('Error inserting videos batch:', insertError);
        }
      }
    }

    // Update account with video count and completion status
    await updateAccountStatus(supabase, account.id, 'completed', {
      last_scraped_at: new Date().toISOString(),
      video_count: videos.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        account: {
          id: account.id,
          username: cleanUsername,
          video_count: videos.length,
          new_videos: newVideos.length,
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
