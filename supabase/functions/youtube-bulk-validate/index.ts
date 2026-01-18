import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  channelId: string;
  channelTitle: string | null;
  status: 'valid' | 'token_revoked' | 'api_not_enabled' | 'credentials_invalid' | 'no_refresh_token' | 'error';
  message: string;
}

interface ValidationSummary {
  total: number;
  valid: number;
  issues: number;
}

async function validateChannel(
  channel: any,
  supabase: any
): Promise<ValidationResult> {
  const channelTitle = channel.channel_title || channel.channel_handle || `Channel ${channel.id.slice(0, 8)}`;

  // Check if has refresh token
  if (!channel.refresh_token) {
    return {
      channelId: channel.id,
      channelTitle,
      status: 'no_refresh_token',
      message: 'No refresh token stored. Please re-authorize.',
    };
  }

  // Check if has credentials
  if (!channel.google_client_id || !channel.google_client_secret) {
    return {
      channelId: channel.id,
      channelTitle,
      status: 'credentials_invalid',
      message: 'Missing OAuth credentials. Please update credentials.',
    };
  }

  try {
    // Try to refresh token
    console.log(`Validating channel: ${channelTitle}`);
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: channel.google_client_id,
        client_secret: channel.google_client_secret,
        refresh_token: channel.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.log(`Token refresh failed for ${channelTitle}: ${tokenData.error}`);
      
      // Check error type
      const revokedErrors = ['invalid_grant', 'unauthorized_client', 'access_denied'];
      if (revokedErrors.includes(tokenData.error)) {
        // Update channel status
        await supabase
          .from('youtube_channels')
          .update({
            auth_status: 'token_revoked',
            is_connected: false,
          })
          .eq('id', channel.id);

        return {
          channelId: channel.id,
          channelTitle,
          status: 'token_revoked',
          message: 'Authorization expired or revoked. Please re-authorize.',
        };
      }

      return {
        channelId: channel.id,
        channelTitle,
        status: 'credentials_invalid',
        message: tokenData.error_description || tokenData.error,
      };
    }

    // Test API access
    console.log(`Testing API access for ${channelTitle}`);
    
    const apiResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    const apiData = await apiResponse.json();

    if (apiData.error) {
      console.log(`API test failed for ${channelTitle}:`, apiData.error);
      
      if (apiData.error.errors?.[0]?.reason === 'accessNotConfigured') {
        await supabase
          .from('youtube_channels')
          .update({
            auth_status: 'api_not_enabled',
            is_connected: false,
          })
          .eq('id', channel.id);

        return {
          channelId: channel.id,
          channelTitle,
          status: 'api_not_enabled',
          message: 'YouTube Data API v3 not enabled in Google Cloud Console.',
        };
      }

      return {
        channelId: channel.id,
        channelTitle,
        status: 'error',
        message: apiData.error.message || 'API verification failed',
      };
    }

    // Success - update token in database
    await supabase
      .from('youtube_channels')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        auth_status: 'connected',
        is_connected: true,
      })
      .eq('id', channel.id);

    console.log(`Channel ${channelTitle} validated successfully`);

    return {
      channelId: channel.id,
      channelTitle,
      status: 'valid',
      message: 'Channel is properly connected.',
    };
  } catch (error: any) {
    console.error(`Error validating channel ${channelTitle}:`, error);
    return {
      channelId: channel.id,
      channelTitle,
      status: 'error',
      message: error.message || 'Unknown error occurred',
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const channelIds: string[] = body.channelIds || [];

    // Check if user is owner
    const { data: isOwner } = await supabase.rpc('is_owner', { _user_id: user.id });

    // Fetch channels to validate
    let query = supabase
      .from('youtube_channels')
      .select('id, channel_title, channel_handle, refresh_token, google_client_id, google_client_secret, auth_status, user_id');

    if (channelIds.length > 0) {
      query = query.in('id', channelIds);
    }

    if (!isOwner) {
      query = query.eq('user_id', user.id);
    }

    const { data: channels, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching channels:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch channels' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!channels || channels.length === 0) {
      return new Response(
        JSON.stringify({
          summary: { total: 0, valid: 0, issues: 0 },
          results: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting validation of ${channels.length} channels`);

    const results: ValidationResult[] = [];

    // Validate each channel with a small delay to avoid rate limiting
    for (const channel of channels) {
      const result = await validateChannel(channel, supabase);
      results.push(result);

      // Small delay between validations (100ms)
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const summary: ValidationSummary = {
      total: results.length,
      valid: results.filter((r) => r.status === 'valid').length,
      issues: results.filter((r) => r.status !== 'valid').length,
    };

    console.log(`Validation complete: ${summary.valid} valid, ${summary.issues} issues`);

    return new Response(
      JSON.stringify({ summary, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in youtube-bulk-validate:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
