import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

interface TikWMVideo {
  id: string;
  title: string;
  duration: number;
  cover: string;
  play: string;
  wmplay: string;
  music: string;
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  create_time: number;
}

async function fetchUserInfo(username: string): Promise<TikWMUserInfo | null> {
  try {
    const response = await fetch('https://www.tikwm.com/api/user/info', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: `unique_id=${encodeURIComponent(username)}`,
    });
    
    const data = await response.json();
    console.log('TikWM user info response:', JSON.stringify(data));
    
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

async function fetchAllVideos(secUid: string, username: string): Promise<TikWMVideo[]> {
  const allVideos: TikWMVideo[] = [];
  let cursor = '0';
  let hasMore = true;
  
  while (hasMore) {
    try {
      console.log(`Fetching videos for ${username} (secUid: ${secUid.substring(0, 20)}...), cursor: ${cursor}`);
      
      const response = await fetch('https://www.tikwm.com/api/user/posts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: `secUid=${encodeURIComponent(secUid)}&count=35&cursor=${cursor}`,
      });
      
      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type') || '';
      const responseText = await response.text();
      
      if (!contentType.includes('application/json') || responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<')) {
        console.error('TikWM returned HTML instead of JSON. Response:', responseText.substring(0, 200));
        hasMore = false;
        continue;
      }
      
      const data = JSON.parse(responseText);
      console.log(`TikWM posts response - videos: ${data.data?.videos?.length || 0}, hasMore: ${data.data?.hasMore}`);
      
      if (data.code === 0 && data.data?.videos) {
        allVideos.push(...data.data.videos);
        hasMore = data.data.hasMore === true;
        cursor = data.data.cursor || '0';
        
        // Safety limit to prevent infinite loops
        if (allVideos.length > 1000) {
          console.log('Reached 1000 video limit, stopping pagination');
          break;
        }
        
        // Small delay between requests to avoid rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        console.log('TikWM API returned error or no videos:', JSON.stringify(data));
        hasMore = false;
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      hasMore = false;
    }
  }
  
  return allVideos;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
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

    const { username, accountId } = await req.json();
    
    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting scrape for username: ${username}, user: ${user.id}`);

    // Clean username (remove @ if present)
    const cleanUsername = username.replace(/^@/, '').trim();

    // Fetch user info
    const userInfo = await fetchUserInfo(cleanUsername);
    
    if (!userInfo) {
      return new Response(
        JSON.stringify({ error: 'TikTok user not found or account is private' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if account already exists
    let tiktokAccountId = accountId;
    
    if (!tiktokAccountId) {
      // Check for existing account
      const { data: existingAccount } = await supabase
        .from('tiktok_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('username', cleanUsername)
        .single();

      if (existingAccount) {
        tiktokAccountId = existingAccount.id;
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
    if (tiktokAccountId) {
      const { data, error } = await supabase
        .from('tiktok_accounts')
        .update(accountData)
        .eq('id', tiktokAccountId)
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
    }

    console.log(`Account saved: ${account.id}`);

    // Fetch all videos using secUid
    const videos = await fetchAllVideos(userInfo.secUid, cleanUsername);
    console.log(`Fetched ${videos.length} videos`);

    // Get existing video IDs to avoid duplicates
    const { data: existingVideos } = await supabase
      .from('scraped_videos')
      .select('tiktok_video_id')
      .eq('tiktok_account_id', account.id);

    const existingVideoIds = new Set(existingVideos?.map(v => v.tiktok_video_id) || []);

    // Filter out duplicates
    const newVideos = videos.filter(v => !existingVideoIds.has(v.id));
    console.log(`New videos to insert: ${newVideos.length}`);

    // Batch insert new videos
    if (newVideos.length > 0) {
      const videosToInsert = newVideos.map(video => ({
        user_id: user.id,
        tiktok_account_id: account.id,
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

      // Insert in batches of 100
      for (let i = 0; i < videosToInsert.length; i += 100) {
        const batch = videosToInsert.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from('scraped_videos')
          .insert(batch);
        
        if (insertError) {
          console.error('Error inserting videos batch:', insertError);
        }
      }
    }

    // Update account status and video count
    const { error: updateError } = await supabase
      .from('tiktok_accounts')
      .update({
        scrape_status: 'completed',
        last_scraped_at: new Date().toISOString(),
        video_count: videos.length,
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('Error updating account status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        account: {
          id: account.id,
          username: cleanUsername,
          display_name: userInfo.nickname,
          video_count: videos.length,
          new_videos: newVideos.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scraper error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
