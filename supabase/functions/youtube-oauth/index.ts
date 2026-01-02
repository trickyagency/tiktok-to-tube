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

serve(async (req) => {
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
      console.log('POST request received:', { action, channelId });
    } catch (e) {
      console.error('Failed to parse POST body:', e);
    }
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ============================================
    // ACTION: start-auth
    // Initiates OAuth flow for a specific channel
    // ============================================
    if (action === 'start-auth') {
      // channelId and redirectUrl already parsed from query params or POST body above

      if (!channelId) {
        return new Response(JSON.stringify({ error: 'channel_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Starting OAuth for channel: ${channelId}`);

      // Fetch channel's Google credentials from database
      const { data: channel, error: channelError } = await supabase
        .from('youtube_channels')
        .select('id, user_id, google_client_id, google_redirect_uri')
        .eq('id', channelId)
        .single();

      if (channelError || !channel) {
        console.error('Channel not found:', channelError);
        return new Response(JSON.stringify({ error: 'Channel not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!channel.google_client_id) {
        return new Response(JSON.stringify({ error: 'Channel missing Google Client ID' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use channel's custom redirect URI - this MUST match what's configured in Google Cloud Console
      const DEFAULT_REDIRECT_URI = 'https://repostflow.digitalautomators.com/functions/v1/youtube-oauth?action=callback';
      const callbackUrl = channel.google_redirect_uri || DEFAULT_REDIRECT_URI;
      
      console.log('Using callback URL:', callbackUrl);
      console.log('Channel google_redirect_uri from DB:', channel.google_redirect_uri);

      // Create state object with channel info (encoded as base64url)
      const stateObj = {
        channel_id: channel.id,
        user_id: channel.user_id,
        redirect_url: redirectUrl || '',
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

      console.log(`OAuth URL generated for channel ${channelId}`);

      // Update channel status to 'authorizing'
      await supabase
        .from('youtube_channels')
        .update({ auth_status: 'authorizing' })
        .eq('id', channelId);

      // Return the OAuth URL (frontend will redirect user)
      return new Response(JSON.stringify({ oauth_url: oauthUrl.toString() }), {
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

      console.log('OAuth callback received');

      if (error) {
        console.error('OAuth error from Google:', error);
        return new Response(`
          <html>
            <body>
              <script>
                window.opener?.postMessage({ type: 'youtube-oauth-error', error: '${error}' }, '*');
                window.close();
              </script>
              <p>Authorization failed: ${error}. You can close this window.</p>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (!code || !state) {
        return new Response('Missing code or state parameter', {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Decode state to get channel info
      let stateObj: { channel_id: string; user_id: string; redirect_url: string };
      try {
        stateObj = base64urlDecode(state) as typeof stateObj;
      } catch (e) {
        console.error('Failed to decode state:', e);
        return new Response('Invalid state parameter', {
          status: 400,
          headers: corsHeaders,
        });
      }

      console.log(`Processing callback for channel: ${stateObj.channel_id}`);

      // Fetch THIS channel's credentials from database
      const { data: channel, error: channelError } = await supabase
        .from('youtube_channels')
        .select('id, google_client_id, google_client_secret, google_redirect_uri')
        .eq('id', stateObj.channel_id)
        .single();

      if (channelError || !channel) {
        console.error('Channel not found in callback:', channelError);
        return new Response('Channel not found', {
          status: 404,
          headers: corsHeaders,
        });
      }

      if (!channel.google_client_id || !channel.google_client_secret) {
        console.error('Channel missing OAuth credentials');
        return new Response('Channel missing OAuth credentials', {
          status: 400,
          headers: corsHeaders,
        });
      }

      // MUST use the same redirect URI that was used during authorization
      const DEFAULT_REDIRECT_URI = 'https://repostflow.digitalautomators.com/functions/v1/youtube-oauth?action=callback';
      const callbackUrl = channel.google_redirect_uri || DEFAULT_REDIRECT_URI;
      
      console.log('Token exchange using callback URL:', callbackUrl);

      // Exchange authorization code for tokens using THIS channel's credentials
      console.log('Exchanging code for tokens...');
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: channel.google_client_id,
          client_secret: channel.google_client_secret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: callbackUrl,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('Token exchange error:', tokenData);
        
        // Update channel status to failed
        await supabase
          .from('youtube_channels')
          .update({ auth_status: 'failed' })
          .eq('id', stateObj.channel_id);

        return new Response(`
          <html>
            <body>
              <script>
                window.opener?.postMessage({ type: 'youtube-oauth-error', error: '${tokenData.error_description || tokenData.error}' }, '*');
                window.close();
              </script>
              <p>Token exchange failed: ${tokenData.error_description || tokenData.error}. You can close this window.</p>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      console.log('Tokens received successfully');

      // Fetch YouTube channel info using the access token
      console.log('Fetching YouTube channel info...');
      const channelInfoResponse = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        }
      );

      const channelInfo = await channelInfoResponse.json();
      console.log('Channel info response:', JSON.stringify(channelInfo));

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
      } else {
        // No YouTube channel found - user hasn't created one yet
        console.warn('No YouTube channel found for this Google account');
        channelTitle = 'No YouTube Channel';
        authStatus = 'no_channel';
      }

      // Calculate token expiration time
      const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

      // Build update object - only include refresh_token if Google returned one
      // (Google doesn't always return refresh_token on re-authorization)
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
        console.log('New refresh_token received and will be stored');
      } else {
        console.log('No new refresh_token received - keeping existing one');
      }

      // Update channel with tokens and info
      const { error: updateError } = await supabase
        .from('youtube_channels')
        .update(updateData)
        .eq('id', stateObj.channel_id);

      if (updateError) {
        console.error('Failed to update channel:', updateError);
        return new Response(`
          <html>
            <body>
              <script>
                window.opener?.postMessage({ type: 'youtube-oauth-error', error: 'Failed to save tokens' }, '*');
                window.close();
              </script>
              <p>Failed to save tokens. You can close this window.</p>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      console.log(`Channel ${stateObj.channel_id} successfully connected as "${channelTitle}"`);

      // Return success page that communicates with opener window
      return new Response(`
        <html>
          <body>
            <script>
              window.opener?.postMessage({ 
                type: 'youtube-oauth-success', 
                channelId: '${stateObj.channel_id}',
                channelTitle: '${channelTitle.replace(/'/g, "\\'")}',
                authStatus: '${authStatus}'
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
      // channelId already parsed from query params or POST body above

      if (!channelId) {
        return new Response(JSON.stringify({ error: 'channel_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Refreshing token for channel: ${channelId}`);

      // Fetch channel's credentials and refresh token
      const { data: channel, error: channelError } = await supabase
        .from('youtube_channels')
        .select('id, google_client_id, google_client_secret, refresh_token')
        .eq('id', channelId)
        .single();

      if (channelError || !channel) {
        return new Response(JSON.stringify({ error: 'Channel not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!channel.refresh_token || !channel.google_client_id || !channel.google_client_secret) {
        return new Response(JSON.stringify({ error: 'Channel not properly configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Refresh the access token using THIS channel's credentials
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: channel.google_client_id,
          client_secret: channel.google_client_secret,
          refresh_token: channel.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('Token refresh error:', tokenData);
        
        // Check if this is a revoked token error (refresh token is invalid)
        const revokedErrors = ['invalid_grant', 'unauthorized_client', 'access_denied'];
        const isRevoked = revokedErrors.includes(tokenData.error);
        
        if (isRevoked) {
          console.log(`Refresh token revoked for channel ${channelId}, marking as token_revoked`);
          await supabase
            .from('youtube_channels')
            .update({ auth_status: 'token_revoked', is_connected: false })
            .eq('id', channelId);
        }
        
        return new Response(JSON.stringify({ 
          error: tokenData.error_description || tokenData.error,
          revoked: isRevoked
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

      // Update channel with new access token
      await supabase
        .from('youtube_channels')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: tokenExpiresAt,
        })
        .eq('id', channelId);

      console.log(`Token refreshed for channel ${channelId}`);

      return new Response(JSON.stringify({ 
        success: true, 
        access_token: tokenData.access_token,
        expires_at: tokenExpiresAt 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // ACTION: check-channel
    // Polls to check if a YouTube channel now exists
    // ============================================
    if (action === 'check-channel') {
      // channelId already parsed from query params or POST body above

      if (!channelId) {
        return new Response(JSON.stringify({ error: 'channel_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Checking for YouTube channel: ${channelId}`);

      // Fetch channel's credentials and tokens
      const { data: channel, error: channelError } = await supabase
        .from('youtube_channels')
        .select('id, google_client_id, google_client_secret, access_token, refresh_token, token_expires_at, auth_status')
        .eq('id', channelId)
        .single();

      if (channelError || !channel) {
        return new Response(JSON.stringify({ error: 'Channel not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Only check if status is 'no_channel'
      if (channel.auth_status !== 'no_channel') {
        return new Response(JSON.stringify({ found: channel.auth_status === 'connected', message: 'Not in no_channel status' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!channel.access_token || !channel.refresh_token) {
        return new Response(JSON.stringify({ error: 'Channel missing tokens' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let accessToken = channel.access_token;

      // Check if token is expired and refresh if needed
      if (channel.token_expires_at && new Date(channel.token_expires_at) < new Date()) {
        console.log('Token expired, refreshing...');
        
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: channel.google_client_id!,
            client_secret: channel.google_client_secret!,
            refresh_token: channel.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          console.error('Token refresh failed:', tokenData);
          return new Response(JSON.stringify({ error: 'Token refresh failed', found: false }), {
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
      }

      // Check YouTube API for channel
      console.log('Checking YouTube API for channel...');
      const channelInfoResponse = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const channelInfo = await channelInfoResponse.json();

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

        console.log(`YouTube channel detected: ${channelTitle}`);

        return new Response(JSON.stringify({ 
          found: true, 
          channelTitle,
          channelId: ytChannel.id 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('No YouTube channel found yet');
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Unknown action
    return new Response(JSON.stringify({ error: 'Unknown action. Use: start-auth, callback, refresh-token, or check-channel' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in youtube-oauth function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
