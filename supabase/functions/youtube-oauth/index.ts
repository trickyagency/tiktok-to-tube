import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// YouTube OAuth scopes
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload'
].join(' ');

// Base64url encode/decode helpers
function base64urlEncode(obj: object): string {
  const json = JSON.stringify(obj);
  const base64 = btoa(json);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): object {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const json = atob(base64);
  return JSON.parse(json);
}

// Structured logging helper
function createLogger(requestId: string, startTime: number) {
  return (level: 'info' | 'warn' | 'error', message: string, data?: object) => {
    console.log(JSON.stringify({
      requestId,
      level,
      message,
      elapsed: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      ...data
    }));
  };
}

// Error categorization for user-friendly messages
function categorizeGoogleError(error: string, errorDescription?: string): { category: string; userMessage: string } {
  const errorCategories: Record<string, { category: string; userMessage: string }> = {
    'invalid_grant': {
      category: 'token_revoked',
      userMessage: 'Authorization expired or was revoked. Please reconnect your channel.'
    },
    'invalid_client': {
      category: 'config_error',
      userMessage: 'OAuth credentials are invalid. Check your Client ID and Secret in Google Cloud Console.'
    },
    'redirect_uri_mismatch': {
      category: 'config_error',
      userMessage: 'Redirect URI mismatch. Update your Google Cloud Console settings to match the recommended URI.'
    },
    'access_denied': {
      category: 'user_denied',
      userMessage: 'You denied the authorization request. Click Authorize to try again.'
    },
    'unauthorized_client': {
      category: 'config_error',
      userMessage: 'Client is not authorized. Check your OAuth consent screen settings.'
    },
    'invalid_scope': {
      category: 'config_error',
      userMessage: 'Invalid OAuth scope. Ensure YouTube API is enabled in Google Cloud Console.'
    }
  };

  const match = errorCategories[error];
  if (match) return match;

  // Check error description for more context
  if (errorDescription?.toLowerCase().includes('redirect')) {
    return {
      category: 'config_error',
      userMessage: 'Redirect URI issue. Ensure your Google Cloud Console redirect URI matches exactly.'
    };
  }

  return {
    category: 'unknown',
    userMessage: errorDescription || error || 'An unexpected error occurred. Please try again.'
  };
}

// Retry wrapper for fetch requests
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  log: ReturnType<typeof createLogger>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log('info', `Fetch attempt ${attempt}/${maxRetries}`, { url: url.split('?')[0] });
      
      const response = await fetch(url, options);

      // Retry on 5xx server errors
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      log('info', `Fetch successful`, { status: response.status, attempt });
      return response;
    } catch (error) {
      lastError = error as Error;
      log('warn', `Fetch attempt ${attempt} failed`, { 
        error: lastError.message,
        willRetry: attempt < maxRetries 
      });

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  log('error', `All ${maxRetries} fetch attempts failed`, { error: lastError?.message });
  throw lastError;
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  const log = createLogger(requestId, startTime);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  // Support both GET query params and POST JSON body
  let action = url.searchParams.get('action');
  let channelId = url.searchParams.get('channel_id');
  let redirectUrl = url.searchParams.get('redirect_url');
  
  // If POST request, parse JSON body and use those values
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      action = body.action || action;
      channelId = body.channel_id || channelId;
      redirectUrl = body.redirect_url || redirectUrl;
    } catch (e) {
      log('error', 'Failed to parse POST body', { error: (e as Error).message });
    }
  }

  log('info', 'Request received', { action, channelId: channelId?.slice(0, 8), method: req.method });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ============================================
    // ACTION: start-auth
    // Initiates OAuth flow for a specific channel
    // ============================================
    if (action === 'start-auth') {
      if (!channelId) {
        log('error', 'Missing channel_id');
        return new Response(JSON.stringify({ error: 'channel_id is required', requestId }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      log('info', 'Starting OAuth flow', { channelId: channelId.slice(0, 8) });

      // Fetch channel's Google credentials from database
      const { data: channel, error: channelError } = await supabase
        .from('youtube_channels')
        .select('id, user_id, google_client_id, google_redirect_uri')
        .eq('id', channelId)
        .single();

      if (channelError || !channel) {
        log('error', 'Channel not found', { error: channelError?.message });
        return new Response(JSON.stringify({ 
          error: 'Channel not found', 
          requestId,
          category: 'not_found'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!channel.google_client_id) {
        log('error', 'Missing Google Client ID');
        return new Response(JSON.stringify({ 
          error: 'Channel missing Google Client ID. Please configure OAuth credentials.',
          requestId,
          category: 'config_error'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use channel's custom redirect URI
      const DEFAULT_REDIRECT_URI = 'https://repostflow.digitalautomators.com/functions/v1/youtube-oauth?action=callback';
      const callbackUrl = channel.google_redirect_uri || DEFAULT_REDIRECT_URI;
      
      log('info', 'Using callback URL', { callbackUrl, hasCustomUri: !!channel.google_redirect_uri });

      // Create state object with channel info (encoded as base64url)
      const stateObj = {
        channel_id: channel.id,
        user_id: channel.user_id,
        redirect_url: redirectUrl || '',
        request_id: requestId,
        ts: Date.now()
      };
      const state = base64urlEncode(stateObj);

      // Build Google OAuth URL using THIS channel's client_id
      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', channel.google_client_id);
      oauthUrl.searchParams.set('redirect_uri', callbackUrl);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', YOUTUBE_SCOPES);
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'consent');
      oauthUrl.searchParams.set('state', state);

      log('info', 'OAuth URL generated');

      // Update channel status to 'authorizing'
      const { error: updateError } = await supabase
        .from('youtube_channels')
        .update({ auth_status: 'authorizing' })
        .eq('id', channelId);

      if (updateError) {
        log('warn', 'Failed to update status to authorizing', { error: updateError.message });
      }

      log('info', 'OAuth flow initiated successfully');

      // Return the OAuth URL (frontend will redirect user)
      return new Response(JSON.stringify({ 
        oauth_url: oauthUrl.toString(),
        requestId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // ACTION: callback
    // Handles OAuth callback from Google
    // ============================================
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      log('info', 'OAuth callback received', { hasCode: !!code, hasState: !!state, hasError: !!error });

      if (error) {
        const errorDesc = url.searchParams.get('error_description');
        const { category, userMessage } = categorizeGoogleError(error, errorDesc || undefined);
        log('error', 'OAuth error from Google', { error, errorDesc, category });
        
        return new Response(`
          <html>
            <body>
              <script>
                window.opener?.postMessage({ 
                  type: 'youtube-oauth-error', 
                  error: '${userMessage.replace(/'/g, "\\'")}',
                  category: '${category}',
                  requestId: '${requestId}'
                }, '*');
                window.close();
              </script>
              <div style="font-family: system-ui; text-align: center; padding: 50px;">
                <h2>❌ Authorization Failed</h2>
                <p>${userMessage}</p>
                <p style="color: #666; font-size: 12px;">Error: ${error}</p>
                <p style="color: #999; font-size: 11px;">Request ID: ${requestId}</p>
              </div>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (!code || !state) {
        log('error', 'Missing code or state parameter');
        return new Response('Missing code or state parameter', {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Decode state to get channel info
      let stateObj: { channel_id: string; user_id: string; redirect_url: string; request_id?: string };
      try {
        stateObj = base64urlDecode(state) as typeof stateObj;
        log('info', 'State decoded', { channelId: stateObj.channel_id?.slice(0, 8), originalRequestId: stateObj.request_id });
      } catch (e) {
        log('error', 'Failed to decode state', { error: (e as Error).message });
        return new Response('Invalid state parameter', {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Fetch THIS channel's credentials from database
      const { data: channel, error: channelError } = await supabase
        .from('youtube_channels')
        .select('id, google_client_id, google_client_secret, google_redirect_uri')
        .eq('id', stateObj.channel_id)
        .single();

      if (channelError || !channel) {
        log('error', 'Channel not found in callback', { error: channelError?.message });
        return new Response('Channel not found', {
          status: 404,
          headers: corsHeaders,
        });
      }

      if (!channel.google_client_id || !channel.google_client_secret) {
        log('error', 'Channel missing OAuth credentials');
        return new Response('Channel missing OAuth credentials', {
          status: 400,
          headers: corsHeaders,
        });
      }

      // MUST use the same redirect URI that was used during authorization
      const DEFAULT_REDIRECT_URI = 'https://repostflow.digitalautomators.com/functions/v1/youtube-oauth?action=callback';
      const callbackUrl = channel.google_redirect_uri || DEFAULT_REDIRECT_URI;
      
      log('info', 'Token exchange starting', { callbackUrl });

      // Exchange authorization code for tokens using THIS channel's credentials (with retry)
      let tokenData;
      try {
        const tokenResponse = await fetchWithRetry(
          'https://oauth2.googleapis.com/token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: channel.google_client_id,
              client_secret: channel.google_client_secret,
              code: code,
              grant_type: 'authorization_code',
              redirect_uri: callbackUrl,
            }),
          },
          log,
          3,
          1000
        );
        tokenData = await tokenResponse.json();
      } catch (fetchError) {
        log('error', 'Token exchange fetch failed after retries', { error: (fetchError as Error).message });
        
        await supabase
          .from('youtube_channels')
          .update({ auth_status: 'failed' })
          .eq('id', stateObj.channel_id);

        return new Response(`
          <html>
            <body>
              <script>
                window.opener?.postMessage({ 
                  type: 'youtube-oauth-error', 
                  error: 'Network error during token exchange. Please try again.',
                  category: 'network_error',
                  requestId: '${requestId}'
                }, '*');
                window.close();
              </script>
              <div style="font-family: system-ui; text-align: center; padding: 50px;">
                <h2>❌ Network Error</h2>
                <p>Failed to connect to Google servers. Please try again.</p>
                <p style="color: #999; font-size: 11px;">Request ID: ${requestId}</p>
              </div>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (tokenData.error) {
        const { category, userMessage } = categorizeGoogleError(tokenData.error, tokenData.error_description);
        log('error', 'Token exchange error', { error: tokenData.error, errorDesc: tokenData.error_description, category });
        
        // Update channel status to failed
        await supabase
          .from('youtube_channels')
          .update({ auth_status: 'failed' })
          .eq('id', stateObj.channel_id);

        return new Response(`
          <html>
            <body>
              <script>
                window.opener?.postMessage({ 
                  type: 'youtube-oauth-error', 
                  error: '${userMessage.replace(/'/g, "\\'")}',
                  category: '${category}',
                  requestId: '${requestId}'
                }, '*');
                window.close();
              </script>
              <div style="font-family: system-ui; text-align: center; padding: 50px;">
                <h2>❌ Token Exchange Failed</h2>
                <p>${userMessage}</p>
                <p style="color: #666; font-size: 12px;">Error: ${tokenData.error}</p>
                <p style="color: #999; font-size: 11px;">Request ID: ${requestId}</p>
              </div>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      log('info', 'Tokens received successfully', { hasRefreshToken: !!tokenData.refresh_token });

      // Fetch YouTube channel info using the access token (with retry)
      log('info', 'Fetching YouTube channel info');
      let channelInfo;
      try {
        const channelInfoResponse = await fetchWithRetry(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
          {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
          },
          log,
          2,
          500
        );
        channelInfo = await channelInfoResponse.json();
      } catch (fetchError) {
        log('warn', 'Failed to fetch channel info, continuing with limited data', { error: (fetchError as Error).message });
        channelInfo = { items: [] };
      }

      log('info', 'Channel info response', { itemCount: channelInfo.items?.length || 0 });

      let channelTitle = 'Unknown Channel';
      let channelThumbnail = null;
      let subscriberCount = 0;
      let videoCount = 0;
      let youtubeChannelId: string | null = null;
      let authStatus = 'connected';
      let channelHandle: string | null = null;

      if (channelInfo.items && channelInfo.items.length > 0) {
        const ytChannel = channelInfo.items[0];
        youtubeChannelId = ytChannel.id;
        channelTitle = ytChannel.snippet?.title || 'Unknown Channel';
        channelThumbnail = ytChannel.snippet?.thumbnails?.default?.url || null;
        channelHandle = ytChannel.snippet?.customUrl || null;
        subscriberCount = parseInt(ytChannel.statistics?.subscriberCount || '0', 10);
        videoCount = parseInt(ytChannel.statistics?.videoCount || '0', 10);
        log('info', 'YouTube channel found', { channelTitle, youtubeChannelId: youtubeChannelId?.slice(0, 8) });
      } else {
        // No YouTube channel found - user hasn't created one yet
        log('warn', 'No YouTube channel found for this Google account');
        channelTitle = 'No YouTube Channel';
        authStatus = 'no_channel';
      }

      // Calculate token expiration time
      const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

      // Build update object
      const updateData: Record<string, unknown> = {
        channel_id: youtubeChannelId,
        channel_title: channelTitle,
        channel_thumbnail: channelThumbnail,
        channel_handle: channelHandle,
        subscriber_count: subscriberCount,
        video_count: videoCount,
        access_token: tokenData.access_token,
        token_expires_at: tokenExpiresAt,
        auth_status: authStatus,
        is_connected: authStatus === 'connected',
      };

      // Only update refresh_token if we got a new one
      if (tokenData.refresh_token) {
        updateData.refresh_token = tokenData.refresh_token;
        log('info', 'New refresh_token received and will be stored');
      } else {
        log('info', 'No new refresh_token received - keeping existing one');
      }

      // Update channel with tokens and info
      const { error: updateError } = await supabase
        .from('youtube_channels')
        .update(updateData)
        .eq('id', stateObj.channel_id);

      if (updateError) {
        log('error', 'Failed to update channel', { error: updateError.message });
        return new Response(`
          <html>
            <body>
              <script>
                window.opener?.postMessage({ 
                  type: 'youtube-oauth-error', 
                  error: 'Failed to save authorization. Please try again.',
                  category: 'database_error',
                  requestId: '${requestId}'
                }, '*');
                window.close();
              </script>
              <div style="font-family: system-ui; text-align: center; padding: 50px;">
                <h2>❌ Save Failed</h2>
                <p>Failed to save tokens. Please try again.</p>
                <p style="color: #999; font-size: 11px;">Request ID: ${requestId}</p>
              </div>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      log('info', 'Channel successfully connected', { channelTitle, authStatus });

      // Return success page that communicates with opener window
      return new Response(`
        <html>
          <body>
            <script>
              window.opener?.postMessage({ 
                type: 'youtube-oauth-success', 
                channelId: '${stateObj.channel_id}',
                channelTitle: '${channelTitle.replace(/'/g, "\\'")}',
                authStatus: '${authStatus}',
                requestId: '${requestId}'
              }, '*');
              setTimeout(() => window.close(), 1500);
            </script>
            <div style="font-family: system-ui; text-align: center; padding: 50px;">
              <h2>${authStatus === 'connected' ? '✅ Successfully Connected!' : '⚠️ Authorization Complete'}</h2>
              <p>Channel: <strong>${channelTitle}</strong></p>
              ${authStatus === 'no_channel' ? '<p style="color: #d97706;">Create a YouTube channel, then we\'ll detect it automatically.</p>' : ''}
              <p>This window will close automatically...</p>
            </div>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // ============================================
    // ACTION: refresh-token
    // Refreshes access token for a channel
    // ============================================
    if (action === 'refresh-token') {
      if (!channelId) {
        log('error', 'Missing channel_id for refresh');
        return new Response(JSON.stringify({ error: 'channel_id is required', requestId }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      log('info', 'Refreshing token', { channelId: channelId.slice(0, 8) });

      // Fetch channel's credentials and refresh token
      const { data: channel, error: channelError } = await supabase
        .from('youtube_channels')
        .select('id, google_client_id, google_client_secret, refresh_token')
        .eq('id', channelId)
        .single();

      if (channelError || !channel) {
        log('error', 'Channel not found for refresh', { error: channelError?.message });
        return new Response(JSON.stringify({ error: 'Channel not found', requestId }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!channel.refresh_token || !channel.google_client_id || !channel.google_client_secret) {
        log('error', 'Channel not properly configured for refresh');
        return new Response(JSON.stringify({ 
          error: 'Channel not properly configured. Missing credentials or refresh token.',
          requestId,
          category: 'config_error'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Refresh the access token with retry
      let tokenData;
      try {
        const tokenResponse = await fetchWithRetry(
          'https://oauth2.googleapis.com/token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: channel.google_client_id,
              client_secret: channel.google_client_secret,
              refresh_token: channel.refresh_token,
              grant_type: 'refresh_token',
            }),
          },
          log,
          3,
          1000
        );
        tokenData = await tokenResponse.json();
      } catch (fetchError) {
        log('error', 'Token refresh fetch failed after retries', { error: (fetchError as Error).message });
        return new Response(JSON.stringify({ 
          error: 'Network error during token refresh. Please try again.',
          requestId,
          category: 'network_error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (tokenData.error) {
        const { category, userMessage } = categorizeGoogleError(tokenData.error, tokenData.error_description);
        log('error', 'Token refresh error', { error: tokenData.error, category });
        
        // Check if this is a revoked token error
        const revokedErrors = ['invalid_grant', 'unauthorized_client', 'access_denied'];
        const isRevoked = revokedErrors.includes(tokenData.error);
        
        if (isRevoked) {
          log('warn', 'Refresh token revoked, updating status');
          await supabase
            .from('youtube_channels')
            .update({ auth_status: 'token_revoked', is_connected: false })
            .eq('id', channelId);
        }
        
        return new Response(JSON.stringify({ 
          error: userMessage,
          revoked: isRevoked,
          category,
          requestId
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

      // Update channel with new access token
      const { error: updateError } = await supabase
        .from('youtube_channels')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: tokenExpiresAt,
        })
        .eq('id', channelId);

      if (updateError) {
        log('error', 'Failed to save refreshed token', { error: updateError.message });
      }

      log('info', 'Token refreshed successfully');

      return new Response(JSON.stringify({ 
        success: true, 
        access_token: tokenData.access_token,
        expires_at: tokenExpiresAt,
        requestId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // ACTION: check-channel
    // Polls to check if a YouTube channel now exists
    // ============================================
    if (action === 'check-channel') {
      if (!channelId) {
        log('error', 'Missing channel_id for check');
        return new Response(JSON.stringify({ error: 'channel_id is required', requestId }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      log('info', 'Checking for YouTube channel', { channelId: channelId.slice(0, 8) });

      // Fetch channel's credentials and tokens
      const { data: channel, error: channelError } = await supabase
        .from('youtube_channels')
        .select('id, google_client_id, google_client_secret, access_token, refresh_token, token_expires_at, auth_status')
        .eq('id', channelId)
        .single();

      if (channelError || !channel) {
        log('error', 'Channel not found for check', { error: channelError?.message });
        return new Response(JSON.stringify({ error: 'Channel not found', requestId }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Only check if status is 'no_channel'
      if (channel.auth_status !== 'no_channel') {
        log('info', 'Channel not in no_channel status', { currentStatus: channel.auth_status });
        return new Response(JSON.stringify({ 
          found: channel.auth_status === 'connected', 
          message: 'Not in no_channel status',
          requestId 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!channel.access_token || !channel.refresh_token) {
        log('error', 'Channel missing tokens for check');
        return new Response(JSON.stringify({ error: 'Channel missing tokens', requestId }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let accessToken = channel.access_token;

      // Check if token is expired and refresh if needed
      if (channel.token_expires_at && new Date(channel.token_expires_at) < new Date()) {
        log('info', 'Token expired, refreshing');
        
        try {
          const tokenResponse = await fetchWithRetry(
            'https://oauth2.googleapis.com/token',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: channel.google_client_id!,
                client_secret: channel.google_client_secret!,
                refresh_token: channel.refresh_token,
                grant_type: 'refresh_token',
              }),
            },
            log,
            2,
            500
          );

          const tokenData = await tokenResponse.json();
          
          if (tokenData.error) {
            log('error', 'Token refresh failed during check', { error: tokenData.error });
            return new Response(JSON.stringify({ 
              error: 'Token refresh failed', 
              found: false,
              requestId 
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          accessToken = tokenData.access_token;
          const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

          await supabase
            .from('youtube_channels')
            .update({ access_token: accessToken, token_expires_at: tokenExpiresAt })
            .eq('id', channelId);

          log('info', 'Token refreshed during check');
        } catch (fetchError) {
          log('error', 'Token refresh fetch failed during check', { error: (fetchError as Error).message });
          return new Response(JSON.stringify({ 
            error: 'Network error during token refresh', 
            found: false,
            requestId 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Check YouTube API for channel
      log('info', 'Querying YouTube API for channel');
      let channelInfo;
      try {
        const channelInfoResponse = await fetchWithRetry(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          },
          log,
          2,
          500
        );
        channelInfo = await channelInfoResponse.json();
      } catch (fetchError) {
        log('error', 'YouTube API check failed', { error: (fetchError as Error).message });
        return new Response(JSON.stringify({ 
          found: false, 
          error: 'Failed to check YouTube API',
          requestId 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (channelInfo.items && channelInfo.items.length > 0) {
        const ytChannel = channelInfo.items[0];
        const channelTitle = ytChannel.snippet?.title || 'Unknown Channel';
        const channelThumbnail = ytChannel.snippet?.thumbnails?.default?.url || null;
        const subscriberCount = parseInt(ytChannel.statistics?.subscriberCount || '0', 10);
        const videoCount = parseInt(ytChannel.statistics?.videoCount || '0', 10);

        // Update channel to connected
        await supabase
          .from('youtube_channels')
          .update({
            channel_id: ytChannel.id,
            channel_title: channelTitle,
            channel_thumbnail: channelThumbnail,
            subscriber_count: subscriberCount,
            video_count: videoCount,
            auth_status: 'connected',
            is_connected: true,
          })
          .eq('id', channelId);

        log('info', 'YouTube channel detected', { channelTitle });

        return new Response(JSON.stringify({ 
          found: true, 
          channelTitle,
          channelId: ytChannel.id,
          requestId 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      log('info', 'No YouTube channel found yet');
      return new Response(JSON.stringify({ found: false, requestId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Unknown action
    log('warn', 'Unknown action requested', { action });
    return new Response(JSON.stringify({ 
      error: 'Unknown action. Use: start-auth, callback, refresh-token, or check-channel',
      requestId 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    log('error', 'Unhandled error in youtube-oauth function', { error: (error as Error).message });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      requestId,
      category: 'internal_error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
