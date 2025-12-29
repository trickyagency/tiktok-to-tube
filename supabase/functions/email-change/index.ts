import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrandingSettings {
  platformName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  senderName: string;
  senderEmail: string;
}

function generateEmailChangeHtml(branding: BrandingSettings, newEmail: string, confirmUrl: string): string {
  const { platformName, logoUrl, primaryColor, accentColor } = branding;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Email Change - ${platformName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); padding: 40px 40px; text-align: center;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${platformName}" style="max-height: 50px; margin-bottom: 16px;">` : ''}
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                🔐 Confirm Email Change
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px;">
                We received a request to update your email address
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi there,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You requested to change your email address to:
              </p>
              
              <div style="background-color: #f4f4f5; padding: 16px; border-radius: 8px; margin: 0 0 24px 0;">
                <p style="color: ${primaryColor}; font-size: 18px; font-weight: 600; margin: 0; word-break: break-all;">
                  ${newEmail}
                </p>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Click the button below to confirm this change:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 32px 0;">
                    <a href="${confirmUrl}" style="display: inline-block; background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);">
                      Confirm New Email
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 0 0 24px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
                  ⚠️ Security Notice
                </p>
                <p style="color: #92400e; font-size: 14px; margin: 8px 0 0 0; line-height: 1.5;">
                  If you didn't request this email change, you can safely ignore this email. Your email address will remain unchanged.
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                This link expires in 24 hours for security purposes.
              </p>
              
              <!-- Fallback Link -->
              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="color: ${accentColor}; font-size: 12px; word-break: break-all; margin: 8px 0 0 0;">
                  ${confirmUrl}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${platformName}. All rights reserved.
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
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client to get current user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for generating links
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const { newEmail } = await req.json();
    if (!newEmail || typeof newEmail !== "string") {
      return new Response(
        JSON.stringify({ error: "New email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Email change request for user ${user.id}: ${user.email} -> ${newEmail}`);

    // Get site URL for redirect
    const siteUrl = Deno.env.get("SITE_URL") || "https://repostflow.digitalautomators.com";

    // Fetch branding settings
    const { data: settingsData } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value");

    const settingsMap: Record<string, string> = {};
    settingsData?.forEach((s: { key: string; value: string | null }) => {
      if (s.value) settingsMap[s.key] = s.value;
    });

    const branding: BrandingSettings = {
      platformName: settingsMap["EMAIL_PLATFORM_NAME"] || "RepostFlow",
      logoUrl: settingsMap["EMAIL_LOGO_URL"] || "",
      primaryColor: settingsMap["EMAIL_PRIMARY_COLOR"] || "#18181b",
      accentColor: settingsMap["EMAIL_ACCENT_COLOR"] || "#3b82f6",
      senderName: settingsMap["EMAIL_SENDER_NAME"] || "RepostFlow",
      senderEmail: settingsMap["EMAIL_SENDER_ADDRESS"] || "onboarding@resend.dev",
    };

    // Generate email change link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "email_change_new",
      email: user.email!,
      newEmail: newEmail,
      options: {
        redirectTo: `${siteUrl}/dashboard/settings`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Failed to generate email change link:", linkError);
      return new Response(
        JSON.stringify({ error: linkError?.message || "Failed to generate confirmation link" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const confirmUrl = linkData.properties.action_link;
    console.log("Generated email change link for:", newEmail);

    // Send branded email via Resend
    const resend = new Resend(resendApiKey);
    const emailHtml = generateEmailChangeHtml(branding, newEmail, confirmUrl);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${branding.senderName} <${branding.senderEmail}>`,
      to: [newEmail],
      subject: `Confirm Your Email Change - ${branding.platformName}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Failed to send email:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send confirmation email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email change confirmation sent successfully:", emailData?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email sent to your new address" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in email-change function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
