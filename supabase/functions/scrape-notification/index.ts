import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrandingSettings {
  platformName: string;
  senderEmail: string;
  senderName: string;
  primaryColor: string;
  logoUrl: string;
}

const generateScrapeNotificationHtml = (
  branding: BrandingSettings,
  fullName: string | null,
  username: string,
  videosImported: number,
  dashboardUrl: string
): string => {
  const displayName = fullName || 'there';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Videos Synced - ${branding.platformName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);">
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, ${branding.primaryColor} 0%, #6366f1 50%, #8b5cf6 100%); padding: 40px 40px 30px; text-align: center;">
              ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.platformName}" style="max-height: 50px; margin-bottom: 20px;">` : ''}
              <h1 style="color: #ffffff; margin: 0 0 10px; font-size: 28px; font-weight: 700;">
                🎬 New Videos Synced!
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 16px;">
                Your TikTok account has been updated
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hi ${displayName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Great news! Your TikTok account <strong>@${username}</strong> has been synced with <strong>${videosImported} new video${videosImported > 1 ? 's' : ''}</strong>.
              </p>
              
              <!-- Stats Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 12px; text-align: center;">
                    <div style="font-size: 48px; font-weight: 700; color: ${branding.primaryColor}; margin-bottom: 8px;">
                      ${videosImported}
                    </div>
                    <div style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                      New Video${videosImported > 1 ? 's' : ''} Ready
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                These videos are now available in your ${branding.platformName} queue and ready to be published to YouTube.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, ${branding.primaryColor} 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                      View Videos in Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                Happy publishing! 🚀
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px;">
                You received this email because the platform owner synced videos for your account.
              </p>
              <p style="color: #9ca3af; font-size: 13px; margin: 0;">
                © ${new Date().getFullYear()} ${branding.platformName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

serve(async (req: Request): Promise<Response> => {
  console.log("=== Scrape Notification Function Started ===");
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { accountOwnerId, username, videosImported } = body;

    if (!accountOwnerId || !username || !videosImported) {
      console.error("Missing required parameters");
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing scrape notification for user ${accountOwnerId}, account @${username}, ${videosImported} videos`);

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch account owner's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name, email_on_videos_synced")
      .eq("user_id", accountOwnerId)
      .single();

    if (profileError || !profile) {
      console.error("Failed to fetch profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has disabled this notification (default to true if column doesn't exist)
    if (profile.email_on_videos_synced === false) {
      console.log("User has disabled video sync notifications");
      return new Response(
        JSON.stringify({ success: true, message: "Notification disabled by user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch branding settings
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("key, value");

    const getSettingValue = (key: string, defaultValue: string): string => {
      const setting = settings?.find((s: { key: string; value: string | null }) => s.key === key);
      return setting?.value || defaultValue;
    };

    const branding: BrandingSettings = {
      platformName: getSettingValue("platform_name", "RepostFlow"),
      senderEmail: getSettingValue("sender_email", "onboarding@resend.dev"),
      senderName: getSettingValue("sender_name", "RepostFlow"),
      primaryColor: getSettingValue("primary_color", "#4f46e5"),
      logoUrl: getSettingValue("logo_url", ""),
    };

    // Get site URL for dashboard link
    const siteUrl = Deno.env.get("SITE_URL") || "https://qpufyeeqosvgipslwday.lovableproject.com";
    const dashboardUrl = `${siteUrl}/dashboard/queue`;

    // Generate email HTML
    const emailHtml = generateScrapeNotificationHtml(
      branding,
      profile.full_name,
      username,
      videosImported,
      dashboardUrl
    );

    // Send email via Resend
    const resend = new Resend(resendApiKey);
    
    console.log("Sending scrape notification email to:", profile.email);
    
    const emailResponse = await resend.emails.send({
      from: `${branding.senderName} <${branding.senderEmail}>`,
      to: [profile.email],
      subject: `🎬 ${videosImported} new video${videosImported > 1 ? 's' : ''} synced to your @${username} account`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Notification email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in scrape notification function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
