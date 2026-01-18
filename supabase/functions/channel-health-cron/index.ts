import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface HealthCheckResult {
  channelId: string;
  status: string;
  recovered: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[HealthCron][${requestId}] Starting channel health check cron job`);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const results: HealthCheckResult[] = [];
    let recoveredCount = 0;
    let checkedCount = 0;

    // 1. Find channels with health issues or degraded status
    const { data: unhealthyChannels, error: fetchError } = await supabase
      .from("channel_health")
      .select(`
        *,
        youtube_channels!inner (
          id,
          user_id,
          channel_title,
          refresh_token,
          google_client_id,
          google_client_secret,
          token_expires_at,
          auth_status
        )
      `)
      .or("status.eq.degraded,status.like.issues_%")
      .order("last_health_check_at", { ascending: true, nullsFirst: true })
      .limit(20); // Process up to 20 channels per run

    if (fetchError) {
      throw new Error(`Failed to fetch unhealthy channels: ${fetchError.message}`);
    }

    console.log(`[HealthCron][${requestId}] Found ${unhealthyChannels?.length || 0} channels to check`);

    // 2. Process each unhealthy channel
    for (const health of unhealthyChannels || []) {
      const channel = health.youtube_channels;
      if (!channel) continue;

      checkedCount++;
      console.log(`[HealthCron][${requestId}] Checking channel ${channel.id.slice(0, 8)}: ${channel.channel_title}`);

      try {
        // Check if circuit breaker should transition from open to half_open
        if (health.circuit_state === "open" && health.circuit_opened_at) {
          const openedAt = new Date(health.circuit_opened_at);
          const cooldownMs = 5 * 60 * 1000; // 5 minutes
          
          if (Date.now() - openedAt.getTime() >= cooldownMs) {
            console.log(`[HealthCron][${requestId}] Circuit breaker cooldown expired, transitioning to half_open`);
            await supabase
              .from("channel_health")
              .update({ 
                circuit_state: "half_open",
                last_health_check_at: new Date().toISOString()
              })
              .eq("id", health.id);
          } else {
            console.log(`[HealthCron][${requestId}] Circuit breaker still in cooldown`);
            results.push({
              channelId: channel.id,
              status: "skipped",
              recovered: false,
              error: "Circuit breaker in cooldown"
            });
            continue;
          }
        }

        // Attempt token refresh to check if channel is recovered
        if (!channel.refresh_token || !channel.google_client_id || !channel.google_client_secret) {
          console.log(`[HealthCron][${requestId}] Channel missing credentials, cannot check`);
          results.push({
            channelId: channel.id,
            status: "skipped",
            recovered: false,
            error: "Missing credentials"
          });
          continue;
        }

        // Try to refresh the token
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: channel.google_client_id,
            client_secret: channel.google_client_secret,
            refresh_token: channel.refresh_token,
            grant_type: "refresh_token",
          }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
          console.log(`[HealthCron][${requestId}] Token refresh failed: ${tokenData.error}`);
          
          // Update last check time
          await supabase
            .from("channel_health")
            .update({ 
              last_health_check_at: new Date().toISOString(),
              last_error_message: tokenData.error_description || tokenData.error,
              last_error_code: tokenData.error
            })
            .eq("id", health.id);

          results.push({
            channelId: channel.id,
            status: "still_failing",
            recovered: false,
            error: tokenData.error
          });
          continue;
        }

        // Token refresh succeeded! Try a simple API call to verify
        const apiResponse = await fetch(
          "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
          {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          }
        );

        if (!apiResponse.ok) {
          const apiError = await apiResponse.text();
          console.log(`[HealthCron][${requestId}] API check failed: ${apiError}`);
          
          await supabase
            .from("channel_health")
            .update({ 
              last_health_check_at: new Date().toISOString(),
              last_error_message: `API check failed: ${apiResponse.status}`
            })
            .eq("id", health.id);

          results.push({
            channelId: channel.id,
            status: "api_failed",
            recovered: false,
            error: `API status: ${apiResponse.status}`
          });
          continue;
        }

        // Channel is recovered!
        console.log(`[HealthCron][${requestId}] Channel ${channel.id.slice(0, 8)} recovered!`);
        recoveredCount++;

        // Update channel_health to healthy
        await supabase
          .from("channel_health")
          .update({
            status: "healthy",
            previous_status: health.status,
            status_changed_at: new Date().toISOString(),
            last_health_check_at: new Date().toISOString(),
            last_successful_operation_at: new Date().toISOString(),
            circuit_state: "closed",
            circuit_failure_count: 0,
            consecutive_failures: 0,
            consecutive_successes: (health.consecutive_successes || 0) + 1,
            total_successes: (health.total_successes || 0) + 1,
            last_error_message: null,
            last_error_code: null,
            last_error_at: null,
          })
          .eq("id", health.id);

        // Update youtube_channels
        const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
        await supabase
          .from("youtube_channels")
          .update({
            access_token: tokenData.access_token,
            token_expires_at: newExpiresAt,
            auth_status: "connected",
            is_connected: true,
            auth_error_code: null,
            auth_error_message: null,
            auth_error_at: null,
            last_health_check_at: new Date().toISOString(),
            health_check_failures: 0,
          })
          .eq("id", channel.id);

        results.push({
          channelId: channel.id,
          status: "recovered",
          recovered: true
        });

      } catch (channelError: unknown) {
        const errorMessage = channelError instanceof Error ? channelError.message : 'Unknown error';
        console.error(`[HealthCron][${requestId}] Error checking channel ${channel.id}:`, channelError);
        results.push({
          channelId: channel.id,
          status: "error",
          recovered: false,
          error: errorMessage
        });
      }
    }

    // 3. Handle quota reset at midnight PT
    const now = new Date();
    const ptOffset = -8; // Pacific Time offset (simplified, doesn't account for DST)
    const ptHour = (now.getUTCHours() + ptOffset + 24) % 24;
    
    if (ptHour === 0 && now.getUTCMinutes() < 15) {
      console.log(`[HealthCron][${requestId}] Midnight PT - checking for quota resets`);
      
      const { data: quotaChannels, error: quotaError } = await supabase
        .from("channel_health")
        .select("id, channel_id")
        .eq("status", "issues_quota");

      if (!quotaError && quotaChannels?.length) {
        for (const ch of quotaChannels) {
          await supabase
            .from("channel_health")
            .update({
              status: "healthy",
              previous_status: "issues_quota",
              status_changed_at: new Date().toISOString(),
              last_health_check_at: new Date().toISOString(),
              last_error_message: null,
              last_error_code: null,
            })
            .eq("id", ch.id);

          await supabase
            .from("youtube_channels")
            .update({
              auth_status: "connected",
              auth_error_code: null,
              auth_error_message: null,
            })
            .eq("id", ch.channel_id);

          console.log(`[HealthCron][${requestId}] Reset quota status for channel ${ch.channel_id}`);
          recoveredCount++;
        }
      }
    }

    // 4. Proactive token refresh for tokens expiring soon
    const { data: expiringChannels, error: expiringError } = await supabase
      .from("youtube_channels")
      .select("id, refresh_token, google_client_id, google_client_secret, token_expires_at, channel_title")
      .eq("auth_status", "connected")
      .not("refresh_token", "is", null)
      .lt("token_expires_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()) // Expires within 24 hours
      .gt("token_expires_at", new Date().toISOString()) // Not yet expired
      .limit(10);

    if (!expiringError && expiringChannels?.length) {
      console.log(`[HealthCron][${requestId}] Found ${expiringChannels.length} channels with tokens expiring soon`);
      
      for (const channel of expiringChannels) {
        try {
          const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: channel.google_client_id!,
              client_secret: channel.google_client_secret!,
              refresh_token: channel.refresh_token!,
              grant_type: "refresh_token",
            }),
          });

          const tokenData = await tokenResponse.json();

          if (!tokenData.error) {
            const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
            await supabase
              .from("youtube_channels")
              .update({
                access_token: tokenData.access_token,
                token_expires_at: newExpiresAt,
              })
              .eq("id", channel.id);

            console.log(`[HealthCron][${requestId}] Proactively refreshed token for ${channel.channel_title}`);
          }
        } catch (e) {
          console.warn(`[HealthCron][${requestId}] Proactive refresh failed for ${channel.id}:`, e);
        }
      }
    }

    // Summary
    const summary = {
      requestId,
      checkedCount,
      recoveredCount,
      results,
      timestamp: new Date().toISOString()
    };

    console.log(`[HealthCron][${requestId}] Completed. Checked: ${checkedCount}, Recovered: ${recoveredCount}`);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[HealthCron][${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: errorMessage, requestId }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
