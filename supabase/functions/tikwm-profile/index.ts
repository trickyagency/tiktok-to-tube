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

// Fetch user info from TikWM
async function fetchUserInfo(username: string): Promise<TikWMUserInfo | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://www.tikwm.com/api/user/info', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: `unique_id=${encodeURIComponent(username)}`,
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

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
    const { username, accountId } = body;

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanUsername = username.replace(/^@/, '').trim();
    console.log(`Fetching profile for: ${cleanUsername}`);

    // Check if this TikTok account is already added by ANY user (global duplicate check)
    if (!accountId) {
      const { data: globalExisting } = await supabase
        .from('tiktok_accounts')
        .select('id, username, user_id')
        .eq('username', cleanUsername)
        .limit(1)
        .maybeSingle();

      if (globalExisting) {
        console.log('Global duplicate found:', cleanUsername);
        return new Response(
          JSON.stringify({ 
            error: `This TikTok account (@${cleanUsername}) has already been added to the platform.` 
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch user info from TikWM
    console.log('Fetching user info from TikWM for:', cleanUsername);
    const userInfo = await fetchUserInfo(cleanUsername);
    
    if (!userInfo) {
      // If we have an accountId, update the account status to indicate it's private/deleted
      if (accountId) {
        await supabase
          .from('tiktok_accounts')
          .update({ 
            account_status: 'not_found',
            updated_at: new Date().toISOString()
          })
          .eq('id', accountId);
        console.log(`Updated account ${accountId} status to not_found`);
      }
      
      return new Response(
        JSON.stringify({ error: 'TikTok user not found or account is private' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Profile found: ${userInfo.nickname}, followers: ${userInfo.followerCount}`);

    // Check for existing account
    let existingAccountId = accountId;
    
    if (!existingAccountId) {
      const { data: existingAccount } = await supabase
        .from('tiktok_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('username', cleanUsername)
        .single();

      if (existingAccount) {
        existingAccountId = existingAccount.id;
      }
    }

    const accountData = {
      user_id: user.id,
      username: cleanUsername,
      display_name: userInfo.nickname,
      avatar_url: userInfo.avatarLarger,
      follower_count: userInfo.followerCount,
      following_count: userInfo.followingCount,
      video_count: userInfo.videoCount,
      updated_at: new Date().toISOString(),
      last_profile_synced_at: new Date().toISOString(),
      account_status: 'active', // Reset to active when profile is successfully fetched
    };

    let savedAccount;

    if (existingAccountId) {
      // Update existing account
      const { data, error } = await supabase
        .from('tiktok_accounts')
        .update(accountData)
        .eq('id', existingAccountId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating account:', error);
        throw error;
      }
      savedAccount = data;
      console.log('Account updated:', existingAccountId);
    } else {
      // Create new account with pending scrape status
      const { data, error } = await supabase
        .from('tiktok_accounts')
        .insert({
          ...accountData,
          scrape_status: 'pending',
          is_active: true,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating account:', error);
        throw error;
      }
      savedAccount = data;
      console.log('Account created:', savedAccount.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        account: {
          id: savedAccount.id,
          username: savedAccount.username,
          display_name: savedAccount.display_name,
          avatar_url: savedAccount.avatar_url,
          follower_count: savedAccount.follower_count,
          video_count: savedAccount.video_count,
        },
        isNew: !existingAccountId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in tikwm-profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
