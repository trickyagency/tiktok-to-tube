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
  channelTitle: string;
  previousStatus: string;
  newStatus: string;
  action: 'recovered' | 'still_failing' | 'skipped' | 'suspended' | 'quota_reset' | 'token_refreshed' | 'error';
  error?: string;
}

interface ChannelToCheck {
  id: string;
  channel_id: string;
  status: string;
  circuit_state: string | null;
  circuit_opened_at: string | null;
  consecutive_failures: number;
  last_health_check_at: string | null;
  next_health_check_at: string | null;
  youtube_channels: {
    id: string;
    user_id: string;
    channel_title: string | null;
    refresh_token: string | null;
    google_client_id: string | null;
    google_client_secret: string | null;
    token_expires_at: string | null;
    auth_status: string | null;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Generate correlation ID for this run
  const correlationId = `health_${new Date().toISOString().split('T')[0]}_${crypto.randomUUID().slice(0, 8)}`;
  const startTime = Date.now();

  console.log(JSON.stringify({
    correlationId,
    level: 'info',
    message: 'Channel health cron job started',
    timestamp: new Date().toISOString(),
  }));

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const results: HealthCheckResult[] = [];
    let recoveredCount = 0;
    let checkedCount = 0;
    let suspendedCount = 0;

    // =========================================
    // 1. Dynamic Frequency-Based Channel Selection
    // =========================================
    // Connected/Healthy: check if next_health_check_at <= now() OR every 15 minutes
    // Issues/Degraded: check every 5 minutes
    // Suspended: check daily only
    
    const { data: channelsToCheck, error: fetchError } = await supabase
      .from("channel_health")
      .select(`
        id,
        channel_id,
        status,
        circuit_state,
        circuit_opened_at,
        consecutive_failures,
        last_health_check_at,
        next_health_check_at,
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
      .or(`and(status.eq.healthy,or(next_health_check_at.lte.now(),last_health_check_at.lt.${new Date(Date.now() - 15 * 60 * 1000).toISOString()})),and(status.in.(degraded,issues_auth,issues_quota,issues_config,issues_permission),last_health_check_at.lt.${new Date(Date.now() - 5 * 60 * 1000).toISOString()}),and(status.eq.suspended,last_health_check_at.lt.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()})`)
      .order("last_health_check_at", { ascending: true, nullsFirst: true })
      .limit(100);

    if (fetchError) {
      console.error(`[${correlationId}] Failed to fetch channels:`, fetchError.message);
      throw new Error(`Failed to fetch channels: ${fetchError.message}`);
    }

    console.log(JSON.stringify({
      correlationId,
      level: 'info',
      message: `Found ${channelsToCheck?.length || 0} channels to check`,
      breakdown: {
        total: channelsToCheck?.length || 0,
      },
    }));

    // =========================================
    // 2. Process Each Channel
    // =========================================
    for (const health of (channelsToCheck || []) as unknown as ChannelToCheck[]) {
      const channel = health.youtube_channels;
      if (!channel) continue;

      const channelStartTime = Date.now();
      checkedCount++;
      
      console.log(JSON.stringify({
        correlationId,
        level: 'info',
        message: 'Checking channel',
        channelId: channel.id.slice(0, 8),
        channelTitle: channel.channel_title,
        currentStatus: health.status,
        circuitState: health.circuit_state,
        consecutiveFailures: health.consecutive_failures,
      }));

      try {
        // =========================================
        // 2a. Handle Circuit Breaker State Transitions
        // =========================================
        if (health.circuit_state === "open" && health.circuit_opened_at) {
          const openedAt = new Date(health.circuit_opened_at);
          const cooldownMs = 5 * 60 * 1000; // 5 minutes
          
          if (Date.now() - openedAt.getTime() >= cooldownMs) {
            console.log(JSON.stringify({
              correlationId,
              level: 'info',
              message: 'Circuit breaker cooldown expired, transitioning to half_open',
              channelId: channel.id.slice(0, 8),
            }));
            
            await supabase
              .from("channel_health")
              .update({ 
                circuit_state: "half_open",
                last_health_check_at: new Date().toISOString()
              })
              .eq("id", health.id);
          } else {
            console.log(JSON.stringify({
              correlationId,
              level: 'debug',
              message: 'Circuit breaker still in cooldown, skipping',
              channelId: channel.id.slice(0, 8),
              cooldownRemainingMs: cooldownMs - (Date.now() - openedAt.getTime()),
            }));
            
            results.push({
              channelId: channel.id,
              channelTitle: channel.channel_title || 'Unknown',
              previousStatus: health.status,
              newStatus: health.status,
              action: 'skipped',
              error: 'Circuit breaker in cooldown'
            });
            continue;
          }
        }

        // =========================================
        // 2b. Check for SUSPENDED transition (5+ consecutive failures)
        // =========================================
        if (health.consecutive_failures >= 5 && 
            !['issues_auth', 'issues_config'].includes(health.status) &&
            health.status !== 'suspended') {
          
          console.log(JSON.stringify({
            correlationId,
            level: 'warn',
            message: 'Transitioning channel to SUSPENDED after 5+ failures',
            channelId: channel.id.slice(0, 8),
            consecutiveFailures: health.consecutive_failures,
            previousStatus: health.status,
          }));
          
          await supabase
            .from("channel_health")
            .update({
              status: 'suspended',
              previous_status: health.status,
              status_changed_at: new Date().toISOString(),
              last_health_check_at: new Date().toISOString(),
            })
            .eq("id", health.id);
          
          suspendedCount++;
          results.push({
            channelId: channel.id,
            channelTitle: channel.channel_title || 'Unknown',
            previousStatus: health.status,
            newStatus: 'suspended',
            action: 'suspended',
          });
          continue;
        }

        // =========================================
        // 2c. Validate Credentials Exist
        // =========================================
        if (!channel.refresh_token || !channel.google_client_id || !channel.google_client_secret) {
          console.log(JSON.stringify({
            correlationId,
            level: 'debug',
            message: 'Channel missing credentials, skipping',
            channelId: channel.id.slice(0, 8),
          }));
          
          results.push({
            channelId: channel.id,
            channelTitle: channel.channel_title || 'Unknown',
            previousStatus: health.status,
            newStatus: health.status,
            action: 'skipped',
            error: 'Missing credentials'
          });
          continue;
        }

        // =========================================
        // 2d. Attempt Token Refresh
        // =========================================
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
          console.log(JSON.stringify({
            correlationId,
            level: 'warn',
            message: 'Token refresh failed',
            channelId: channel.id.slice(0, 8),
            error: tokenData.error,
            errorDescription: tokenData.error_description,
          }));
          
          // Update last check time and error info
          await supabase
            .from("channel_health")
            .update({ 
              last_health_check_at: new Date().toISOString(),
              last_error_message: tokenData.error_description || tokenData.error,
              last_error_code: tokenData.error,
              last_error_at: new Date().toISOString(),
            })
            .eq("id", health.id);

          results.push({
            channelId: channel.id,
            channelTitle: channel.channel_title || 'Unknown',
            previousStatus: health.status,
            newStatus: health.status,
            action: 'still_failing',
            error: tokenData.error
          });
          continue;
        }

        // =========================================
        // 2e. Verify API Access
        // =========================================
        const apiResponse = await fetch(
          "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
          {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          }
        );

        if (!apiResponse.ok) {
          const apiError = await apiResponse.text();
          console.log(JSON.stringify({
            correlationId,
            level: 'warn',
            message: 'API verification failed',
            channelId: channel.id.slice(0, 8),
            status: apiResponse.status,
            error: apiError.slice(0, 200),
          }));
          
          await supabase
            .from("channel_health")
            .update({ 
              last_health_check_at: new Date().toISOString(),
              last_error_message: `API check failed: ${apiResponse.status}`
            })
            .eq("id", health.id);

          results.push({
            channelId: channel.id,
            channelTitle: channel.channel_title || 'Unknown',
            previousStatus: health.status,
            newStatus: health.status,
            action: 'still_failing',
            error: `API status: ${apiResponse.status}`
          });
          continue;
        }

        // =========================================
        // 2f. Channel Recovered!
        // =========================================
        console.log(JSON.stringify({
          correlationId,
          level: 'info',
          message: 'Channel recovered',
          channelId: channel.id.slice(0, 8),
          previousStatus: health.status,
          elapsedMs: Date.now() - channelStartTime,
        }));
        
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
            consecutive_successes: (health.consecutive_failures > 0 ? 1 : 0),
            last_error_message: null,
            last_error_code: null,
            last_error_at: null,
            auto_recovery_attempts: 0,
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

        // Mark related errors as resolved
        await supabase
          .from("channel_errors")
          .update({
            is_resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: 'cron_auto_recovery',
            resolution_notes: `Auto-resolved by health cron (correlation: ${correlationId})`,
          })
          .eq("channel_id", channel.id)
          .eq("is_resolved", false);

        results.push({
          channelId: channel.id,
          channelTitle: channel.channel_title || 'Unknown',
          previousStatus: health.status,
          newStatus: 'healthy',
          action: 'recovered'
        });

      } catch (channelError: unknown) {
        const errorMessage = channelError instanceof Error ? channelError.message : 'Unknown error';
        console.error(JSON.stringify({
          correlationId,
          level: 'error',
          message: 'Error checking channel',
          channelId: channel.id.slice(0, 8),
          error: errorMessage,
        }));
        
        results.push({
          channelId: channel.id,
          channelTitle: channel.channel_title || 'Unknown',
          previousStatus: health.status,
          newStatus: health.status,
          action: 'error',
          error: errorMessage
        });
      }
    }

    // =========================================
    // 3. Handle Quota Reset at Midnight PT
    // =========================================
    const now = new Date();
    const ptOffset = -8; // Pacific Time offset
    const ptHour = (now.getUTCHours() + ptOffset + 24) % 24;
    
    if (ptHour === 0 && now.getUTCMinutes() < 15) {
      console.log(JSON.stringify({
        correlationId,
        level: 'info',
        message: 'Midnight PT - checking for quota resets',
      }));
      
      const { data: quotaChannels, error: quotaError } = await supabase
        .from("channel_health")
        .select("id, channel_id, youtube_channels(channel_title)")
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
              consecutive_failures: 0,
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

          console.log(JSON.stringify({
            correlationId,
            level: 'info',
            message: 'Reset quota status for channel',
            channelId: ch.channel_id.slice(0, 8),
          }));
          
          recoveredCount++;
          results.push({
            channelId: ch.channel_id,
            channelTitle: (ch.youtube_channels as { channel_title?: string })?.channel_title || 'Unknown',
            previousStatus: 'issues_quota',
            newStatus: 'healthy',
            action: 'quota_reset',
          });
        }
      }
    }

    // =========================================
    // 4. Proactive Token Refresh (tokens expiring within 24h)
    // =========================================
    const { data: expiringChannels, error: expiringError } = await supabase
      .from("youtube_channels")
      .select("id, refresh_token, google_client_id, google_client_secret, token_expires_at, channel_title")
      .eq("auth_status", "connected")
      .not("refresh_token", "is", null)
      .lt("token_expires_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .gt("token_expires_at", new Date().toISOString())
      .limit(10);

    if (!expiringError && expiringChannels?.length) {
      console.log(JSON.stringify({
        correlationId,
        level: 'info',
        message: `Proactively refreshing ${expiringChannels.length} expiring tokens`,
      }));
      
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

            console.log(JSON.stringify({
              correlationId,
              level: 'info',
              message: 'Proactively refreshed token',
              channelId: channel.id.slice(0, 8),
              channelTitle: channel.channel_title,
            }));
            
            results.push({
              channelId: channel.id,
              channelTitle: channel.channel_title || 'Unknown',
              previousStatus: 'healthy',
              newStatus: 'healthy',
              action: 'token_refreshed',
            });
          }
        } catch (e) {
          console.warn(JSON.stringify({
            correlationId,
            level: 'warn',
            message: 'Proactive refresh failed',
            channelId: channel.id.slice(0, 8),
            error: e instanceof Error ? e.message : 'Unknown',
          }));
        }
      }
    }

    // =========================================
    // 5. Summary
    // =========================================
    const summary = {
      checkedCount,
      recoveredCount,
      suspendedCount,
      elapsedMs: Date.now() - startTime,
      resultsCount: results.length,
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify({
      correlationId,
      level: 'info',
      message: 'Health cron job completed',
      ...summary,
    }));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(JSON.stringify({
      correlationId,
      level: 'error',
      message: 'Health cron job failed',
      error: errorMessage,
      elapsedMs: Date.now() - startTime,
    }));
    
    return new Response(
      JSON.stringify({ error: errorMessage, correlationId }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});