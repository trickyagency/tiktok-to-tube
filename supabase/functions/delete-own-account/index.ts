import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const userId = user.id;
    console.log(`User ${user.email} (${userId}) requesting account deletion`);

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is an owner - owners cannot delete themselves
    const { data: isOwner, error: ownerError } = await supabaseAdmin.rpc("is_owner", {
      _user_id: userId,
    });

    if (ownerError) {
      console.error("Error checking owner status:", ownerError);
      throw new Error("Failed to verify account status");
    }

    if (isOwner) {
      throw new Error("Owner accounts cannot be deleted. Please transfer ownership first.");
    }

    console.log(`Starting data deletion for user ${userId}`);

    // Delete data in order to respect foreign key constraints
    // 1. Delete publish_queue (depends on scraped_videos, youtube_channels, schedules)
    const { error: queueError } = await supabaseAdmin
      .from("publish_queue")
      .delete()
      .eq("user_id", userId);
    if (queueError) console.error("Error deleting publish_queue:", queueError);

    // 2. Delete upload_logs
    const { error: logsError } = await supabaseAdmin
      .from("upload_logs")
      .delete()
      .eq("user_id", userId);
    if (logsError) console.error("Error deleting upload_logs:", logsError);

    // 3. Delete scraped_videos (depends on tiktok_accounts)
    const { error: videosError } = await supabaseAdmin
      .from("scraped_videos")
      .delete()
      .eq("user_id", userId);
    if (videosError) console.error("Error deleting scraped_videos:", videosError);

    // 4. Delete publish_schedules
    const { error: schedulesError } = await supabaseAdmin
      .from("publish_schedules")
      .delete()
      .eq("user_id", userId);
    if (schedulesError) console.error("Error deleting publish_schedules:", schedulesError);

    // 5. Delete scrape_queue
    const { error: scrapeQueueError } = await supabaseAdmin
      .from("scrape_queue")
      .delete()
      .eq("user_id", userId);
    if (scrapeQueueError) console.error("Error deleting scrape_queue:", scrapeQueueError);

    // 6. Delete apify_runs
    const { error: apifyError } = await supabaseAdmin
      .from("apify_runs")
      .delete()
      .eq("user_id", userId);
    if (apifyError) console.error("Error deleting apify_runs:", apifyError);

    // 7. Delete account_subscriptions
    const { error: accSubError } = await supabaseAdmin
      .from("account_subscriptions")
      .delete()
      .eq("user_id", userId);
    if (accSubError) console.error("Error deleting account_subscriptions:", accSubError);

    // 8. Delete subscription_history
    const { error: subHistError } = await supabaseAdmin
      .from("subscription_history")
      .delete()
      .eq("user_id", userId);
    if (subHistError) console.error("Error deleting subscription_history:", subHistError);

    // 9. Get youtube channels to delete quota usage
    const { data: channels } = await supabaseAdmin
      .from("youtube_channels")
      .select("id")
      .eq("user_id", userId);

    if (channels && channels.length > 0) {
      const channelIds = channels.map(c => c.id);
      const { error: quotaError } = await supabaseAdmin
        .from("youtube_quota_usage")
        .delete()
        .in("youtube_channel_id", channelIds);
      if (quotaError) console.error("Error deleting youtube_quota_usage:", quotaError);
    }

    // 10. Delete youtube_channels
    const { error: ytChannelsError } = await supabaseAdmin
      .from("youtube_channels")
      .delete()
      .eq("user_id", userId);
    if (ytChannelsError) console.error("Error deleting youtube_channels:", ytChannelsError);

    // 11. Delete tiktok_accounts
    const { error: tiktokError } = await supabaseAdmin
      .from("tiktok_accounts")
      .delete()
      .eq("user_id", userId);
    if (tiktokError) console.error("Error deleting tiktok_accounts:", tiktokError);

    // 12. Delete user_subscriptions
    const { error: userSubError } = await supabaseAdmin
      .from("user_subscriptions")
      .delete()
      .eq("user_id", userId);
    if (userSubError) console.error("Error deleting user_subscriptions:", userSubError);

    // 13. Delete payments
    const { error: paymentsError } = await supabaseAdmin
      .from("payments")
      .delete()
      .eq("user_id", userId);
    if (paymentsError) console.error("Error deleting payments:", paymentsError);

    // 14. Delete earnings
    const { error: earningsError } = await supabaseAdmin
      .from("earnings")
      .delete()
      .eq("user_id", userId);
    if (earningsError) console.error("Error deleting earnings:", earningsError);

    // 15. Delete videos
    const { error: videosTableError } = await supabaseAdmin
      .from("videos")
      .delete()
      .eq("user_id", userId);
    if (videosTableError) console.error("Error deleting videos:", videosTableError);

    // 16. Delete avatar from storage
    try {
      const { data: files } = await supabaseAdmin.storage
        .from("avatars")
        .list(userId);
      
      if (files && files.length > 0) {
        const filePaths = files.map(f => `${userId}/${f.name}`);
        await supabaseAdmin.storage.from("avatars").remove(filePaths);
        console.log(`Deleted ${filePaths.length} avatar files`);
      }
    } catch (storageError) {
      console.error("Error deleting avatar files:", storageError);
    }

    // 17. Finally, delete the user from auth.users
    // This will cascade to profiles, user_roles, user_limits
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Failed to delete user:", deleteError);
      throw new Error(`Failed to delete account: ${deleteError.message}`);
    }

    console.log(`User ${userId} and all associated data deleted successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account deleted successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Delete account error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
