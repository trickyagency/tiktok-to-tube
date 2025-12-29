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

const generateWelcomeEmailHtml = (
  branding: BrandingSettings,
  fullName: string | null,
  dashboardUrl: string
): string => {
  const displayName = fullName || 'there';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${branding.platformName}</title>
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
                🎉 Welcome to ${branding.platformName}!
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 16px;">
                Your content automation journey starts now
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
                Thanks for joining ${branding.platformName}! We're excited to help you automate your content across platforms and grow your audience.
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px; font-weight: 600;">
                📋 Quick Start Guide:
              </p>
              
              <!-- Quick Start Steps -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 8px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="width: 50%; padding: 8px; vertical-align: top;">
                          <div style="background: linear-gradient(135deg, ${branding.primaryColor}, #6366f1); color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px; margin-bottom: 8px;">1</div>
                          <p style="color: #111827; font-size: 14px; font-weight: 600; margin: 0 0 4px;">Connect YouTube</p>
                          <p style="color: #6b7280; font-size: 13px; margin: 0;">Link your channel for automated uploads</p>
                        </td>
                        <td style="width: 50%; padding: 8px; vertical-align: top;">
                          <div style="background: linear-gradient(135deg, ${branding.primaryColor}, #6366f1); color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px; margin-bottom: 8px;">2</div>
                          <p style="color: #111827; font-size: 14px; font-weight: 600; margin: 0 0 4px;">Add TikTok Accounts</p>
                          <p style="color: #6b7280; font-size: 13px; margin: 0;">Monitor your favorite creators</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="width: 50%; padding: 8px; vertical-align: top;">
                          <div style="background: linear-gradient(135deg, ${branding.primaryColor}, #6366f1); color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px; margin-bottom: 8px;">3</div>
                          <p style="color: #111827; font-size: 14px; font-weight: 600; margin: 0 0 4px;">Set Up Schedules</p>
                          <p style="color: #6b7280; font-size: 13px; margin: 0;">Automate your publishing times</p>
                        </td>
                        <td style="width: 50%; padding: 8px; vertical-align: top;">
                          <div style="background: linear-gradient(135deg, ${branding.primaryColor}, #6366f1); color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px; margin-bottom: 8px;">4</div>
                          <p style="color: #111827; font-size: 14px; font-weight: 600; margin: 0 0 4px;">Track Analytics</p>
                          <p style="color: #6b7280; font-size: 13px; margin: 0;">Monitor your growth and performance</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, ${branding.primaryColor} 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                💡 Need help? Reply to this email or contact our support team.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
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
  console.log("=== Welcome Email Function Started ===");
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Create user client to get authenticated user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing welcome email for user:", user.id);

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already received welcome email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("welcome_email_sent, email, full_name")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Failed to fetch profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already sent, return early
    if (profile.welcome_email_sent) {
      console.log("Welcome email already sent for user:", user.id);
      return new Response(
        JSON.stringify({ success: true, message: "Welcome email already sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch branding settings
    const { data: settings } = await supabaseAdmin
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
    const dashboardUrl = `${siteUrl}/dashboard`;

    // Generate email HTML
    const emailHtml = generateWelcomeEmailHtml(branding, profile.full_name, dashboardUrl);

    // Send email via Resend
    const resend = new Resend(resendApiKey);
    
    console.log("Sending welcome email to:", profile.email);
    
    const emailResponse = await resend.emails.send({
      from: `${branding.senderName} <${branding.senderEmail}>`,
      to: [profile.email],
      subject: `🎉 Welcome to ${branding.platformName} - Let's Get Started!`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Mark welcome email as sent
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ welcome_email_sent: true })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update welcome_email_sent flag:", updateError);
      // Don't fail the request, email was still sent
    }

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in welcome email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
