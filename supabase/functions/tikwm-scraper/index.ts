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

// Fetch user info from TikWM (still works)
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

// Fetch videos using TikWM API (primary method)
async function fetchVideosFromTikWM(secUid: string, username: string): Promise<TikTokVideo[]> {
  const allVideos: TikTokVideo[] = [];
  let cursor = 0;
  let hasMore = true;

  console.log(`Fetching videos for ${username} using TikWM API`);

  while (hasMore && allVideos.length < 500) {
    try {
      // Try with sec_uid parameter
      const response = await fetch('https://www.tikwm.com/api/user/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        body: `sec_uid=${encodeURIComponent(secUid)}&count=35&cursor=${cursor}`,
      });

      const responseText = await response.text();
      console.log(`TikWM posts response: status=${response.status}, length=${responseText.length}`);

      if (response.status === 200 && responseText.startsWith('{')) {
        const data = JSON.parse(responseText);
        
        if (data.code === 0 && data.data?.videos) {
          const videos = data.data.videos;
          console.log(`TikWM returned ${videos.length} videos, cursor: ${cursor}`);
          
          for (const video of videos) {
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

          hasMore = data.data.hasMore === true || videos.length >= 35;
          cursor = data.data.cursor || (cursor + 35);
          
          if (hasMore) {
            await new Promise(r => setTimeout(r, 1500)); // Rate limit
          }
        } else {
          console.log(`TikWM posts API returned code: ${data.code}, msg: ${data.msg}`);
          hasMore = false;
        }
      } else {
        console.log(`TikWM posts failed: status=${response.status}`);
        hasMore = false;
      }
    } catch (error) {
      console.error('TikWM posts error:', error);
      hasMore = false;
    }
  }

  return allVideos;
}

// Fetch videos using TikTok's native item_list API (fallback)
async function fetchVideosFromTikTokNative(secUid: string, username: string): Promise<TikTokVideo[]> {
  const allVideos: TikTokVideo[] = [];
  let cursor = 0;

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

  console.log(`Trying TikTok native API for ${username}`);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const userAgent = userAgents[attempt - 1];
      const params = new URLSearchParams({
        aid: '1988',
        count: '35',
        cursor: cursor.toString(),
        secUid: secUid,
        device_platform: 'web_pc',
      });

      const url = `https://www.tiktok.com/api/post/item_list/?${params.toString()}`;
      console.log(`TikTok API attempt ${attempt}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json',
          'Referer': `https://www.tiktok.com/@${username}`,
        },
      });

      const responseText = await response.text();
      console.log(`TikTok native API: status=${response.status}, length=${responseText.length}`);

      if (response.status === 200 && responseText.length > 10 && responseText.startsWith('{')) {
        const data = JSON.parse(responseText);
        
        if (data.itemList && data.itemList.length > 0) {
          console.log(`TikTok native API returned ${data.itemList.length} videos`);
          
          for (const item of data.itemList) {
            allVideos.push({
              id: item.id,
              title: item.desc || '',
              duration: item.video?.duration || 0,
              cover: item.video?.cover || '',
              play: item.video?.playAddr || '',
              play_count: item.stats?.playCount || 0,
              digg_count: item.stats?.diggCount || 0,
              comment_count: item.stats?.commentCount || 0,
              share_count: item.stats?.shareCount || 0,
              create_time: item.createTime || 0,
            });
          }
          break;
        }
      }
      
      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error(`TikTok native API attempt ${attempt} error:`, error);
    }
  }

  return allVideos;
}

// Main video fetching function - tries multiple methods
async function fetchAllVideos(secUid: string, username: string): Promise<TikTokVideo[]> {
  // Method 1: TikWM API (most reliable when working)
  console.log('Trying TikWM video scraping...');
  let videos = await fetchVideosFromTikWM(secUid, username);
  
  if (videos.length > 0) {
    console.log(`TikWM succeeded with ${videos.length} videos`);
    return videos;
  }

  // Method 2: TikTok native API
  console.log('TikWM failed, trying TikTok native API...');
  videos = await fetchVideosFromTikTokNative(secUid, username);
  
  if (videos.length > 0) {
    console.log(`TikTok native API succeeded with ${videos.length} videos`);
    return videos;
  }

  // Method 3: Profile page scraping
  console.log('Native API failed, trying profile page scraping...');
  videos = await fetchVideosFromProfilePage(username);
  
  console.log(`Profile scraping returned ${videos.length} videos`);
  return videos;
}

// Scrape videos from TikTok profile page HTML
async function fetchVideosFromProfilePage(username: string): Promise<TikTokVideo[]> {
  const videos: TikTokVideo[] = [];
  
  try {
    const profileUrl = `https://www.tiktok.com/@${username}`;
    console.log(`Fetching profile page: ${profileUrl}`);

    const response = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = await response.text();
    console.log(`Profile page: status=${response.status}, length=${html.length}`);

    // Try SIGI_STATE
    const sigiMatch = html.match(/<script id="SIGI_STATE" type="application\/json">(.+?)<\/script>/s);
    if (sigiMatch) {
      try {
        const sigiData = JSON.parse(sigiMatch[1]);
        if (sigiData.ItemModule) {
          console.log('Found SIGI_STATE with ItemModule');
          for (const item of Object.values(sigiData.ItemModule) as any[]) {
            videos.push({
              id: item.id,
              title: item.desc || '',
              duration: item.video?.duration || 0,
              cover: item.video?.cover || '',
              play: item.video?.playAddr || '',
              play_count: item.stats?.playCount || 0,
              digg_count: item.stats?.diggCount || 0,
              comment_count: item.stats?.commentCount || 0,
              share_count: item.stats?.shareCount || 0,
              create_time: item.createTime || 0,
            });
          }
        }
      } catch (e) {
        console.error('SIGI_STATE parse error:', e);
      }
    }

    // Try __UNIVERSAL_DATA_FOR_REHYDRATION__
    if (videos.length === 0) {
      const universalMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.+?)<\/script>/s);
      if (universalMatch) {
        try {
          const data = JSON.parse(universalMatch[1]);
          const itemList = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.itemList;
          if (itemList) {
            console.log('Found __UNIVERSAL_DATA with itemList');
            for (const item of itemList) {
              videos.push({
                id: item.id,
                title: item.desc || '',
                duration: item.video?.duration || 0,
                cover: item.video?.cover || '',
                play: item.video?.playAddr || '',
                play_count: item.stats?.playCount || 0,
                digg_count: item.stats?.diggCount || 0,
                comment_count: item.stats?.commentCount || 0,
                share_count: item.stats?.shareCount || 0,
                create_time: item.createTime || 0,
              });
            }
          }
        } catch (e) {
          console.error('UNIVERSAL_DATA parse error:', e);
        }
      }
    }
  } catch (error) {
    console.error('Profile page scraping error:', error);
  }

  return videos;
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

    // Fetch user info from TikWM (still works)
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

    // Fetch videos using all available methods
    const videos = await fetchAllVideos(userInfo.secUid, cleanUsername);
    console.log(`Fetched ${videos.length} videos total`);

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

    // Update account status - use 'failed' instead of 'partial' for constraint
    const finalStatus = videos.length > 0 ? 'completed' : 'failed';
    const { error: updateError } = await supabase
      .from('tiktok_accounts')
      .update({
        scrape_status: finalStatus,
        last_scraped_at: new Date().toISOString(),
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
