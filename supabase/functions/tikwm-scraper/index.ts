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

// Fetch videos using TikTok's native item_list API
async function fetchVideosFromTikTok(secUid: string, username: string): Promise<TikTokVideo[]> {
  const allVideos: TikTokVideo[] = [];
  let cursor = 0;
  let hasMore = true;

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  ];

  while (hasMore) {
    console.log(`Fetching videos for ${username} using TikTok API, cursor: ${cursor}`);

    let pageData: any = null;
    
    // Try TikTok's native item_list API
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const userAgent = userAgents[attempt - 1] || userAgents[0];
        const params = new URLSearchParams({
          aid: '1988',
          count: '35',
          cursor: cursor.toString(),
          secUid: secUid,
          device_platform: 'web_pc',
          WebIdLastTime: Date.now().toString(),
        });

        const url = `https://www.tiktok.com/api/post/item_list/?${params.toString()}`;
        console.log(`TikTok API attempt ${attempt}: ${url.substring(0, 100)}...`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': userAgent,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': `https://www.tiktok.com/@${username}`,
            'Origin': 'https://www.tiktok.com',
          },
        });

        const responseText = await response.text();
        console.log(`TikTok API response status=${response.status}, length=${responseText.length}, firstChars=${JSON.stringify(responseText.substring(0, 100))}`);

        if (response.status === 200 && responseText.startsWith('{')) {
          pageData = JSON.parse(responseText);
          if (pageData.itemList || pageData.statusCode === 0) {
            console.log(`TikTok API success: ${pageData.itemList?.length || 0} videos`);
            break;
          }
        }

        // If TikTok API failed, try SSSTik approach
        console.log(`TikTok API attempt ${attempt} failed, trying alternative...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
        
      } catch (error) {
        console.error(`TikTok API attempt ${attempt} error:`, error);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }

    // If TikTok native API failed, try alternative scraping method
    if (!pageData?.itemList) {
      console.log('TikTok native API failed, trying SSSTik-style approach...');
      pageData = await fetchVideosAlternative(secUid, username, cursor);
    }

    if (!pageData?.itemList && !pageData?.videos) {
      console.log('All video fetching methods failed');
      hasMore = false;
      break;
    }

    // Parse videos from whichever source worked
    const videoList = pageData.itemList || pageData.videos || [];
    
    for (const item of videoList) {
      const video: TikTokVideo = {
        id: item.id || item.video_id,
        title: item.desc || item.title || '',
        duration: item.video?.duration || item.duration || 0,
        cover: item.video?.cover || item.cover || '',
        play: item.video?.playAddr || item.play || item.video?.downloadAddr || '',
        play_count: item.stats?.playCount || item.play_count || 0,
        digg_count: item.stats?.diggCount || item.digg_count || 0,
        comment_count: item.stats?.commentCount || item.comment_count || 0,
        share_count: item.stats?.shareCount || item.share_count || 0,
        create_time: item.createTime || item.create_time || 0,
      };
      allVideos.push(video);
    }

    hasMore = pageData.hasMore === true || pageData.has_more === true;
    cursor = pageData.cursor || (cursor + 35);

    console.log(`Fetched ${videoList.length} videos, total: ${allVideos.length}, hasMore: ${hasMore}`);

    // Safety limit
    if (allVideos.length >= 500) {
      console.log('Reached 500 video limit');
      break;
    }

    if (hasMore) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return allVideos;
}

// Alternative method using a public TikTok data endpoint
async function fetchVideosAlternative(secUid: string, username: string, cursor: number): Promise<any> {
  try {
    // Try the TikTok web embed data approach
    const profileUrl = `https://www.tiktok.com/@${username}`;
    console.log(`Fetching profile page: ${profileUrl}`);

    const response = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = await response.text();
    console.log(`Profile page response: status=${response.status}, length=${html.length}`);

    // Try to extract SIGI_STATE data which contains video info
    const sigiMatch = html.match(/<script id="SIGI_STATE" type="application\/json">(.+?)<\/script>/s);
    if (sigiMatch) {
      const sigiData = JSON.parse(sigiMatch[1]);
      console.log('Found SIGI_STATE data');
      
      if (sigiData.ItemModule) {
        const videos = Object.values(sigiData.ItemModule).map((item: any) => ({
          id: item.id,
          desc: item.desc,
          video: {
            duration: item.video?.duration,
            cover: item.video?.cover,
            playAddr: item.video?.playAddr,
          },
          stats: item.stats,
          createTime: item.createTime,
        }));
        
        return { itemList: videos, hasMore: false };
      }
    }

    // Try __UNIVERSAL_DATA_FOR_REHYDRATION__
    const universalMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.+?)<\/script>/s);
    if (universalMatch) {
      const universalData = JSON.parse(universalMatch[1]);
      console.log('Found __UNIVERSAL_DATA_FOR_REHYDRATION__ data');
      
      const defaultScope = universalData?.__DEFAULT_SCOPE__;
      const itemList = defaultScope?.['webapp.user-detail']?.userInfo?.user?.itemList ||
                       defaultScope?.['webapp.user-detail']?.itemList;
      
      if (itemList) {
        return { itemList, hasMore: false };
      }
    }

    console.log('Could not extract video data from profile page');
    return null;
  } catch (error) {
    console.error('Alternative fetch error:', error);
    return null;
  }
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

    // Fetch videos using TikTok's native API
    const videos = await fetchVideosFromTikTok(userInfo.secUid, cleanUsername);
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

    // Update account status
    const { error: updateError } = await supabase
      .from('tiktok_accounts')
      .update({
        scrape_status: videos.length > 0 ? 'completed' : 'partial',
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
