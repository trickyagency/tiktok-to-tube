import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  role: "user" | "admin";
}

interface BrandingSettings {
  platformName: string;
  senderName: string;
  senderAddress: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
}

function generateInviteEmailHtml(options: BrandingSettings & { role: string; inviteUrl: string }): string {
  const { platformName, logoUrl, primaryColor, accentColor, role, inviteUrl } = options;
  
  const roleBadge = role === "admin" 
    ? `<span style="display: inline-block; background: linear-gradient(135deg, ${accentColor}, #6366f1); color: white; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">Admin Access</span>`
    : `<span style="display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">User Access</span>`;

  const logoHtml = logoUrl 
    ? `<img src="${logoUrl}" alt="${platformName}" style="max-height: 48px;" />`
    : `<div style="font-size: 28px; font-weight: 800; background: linear-gradient(135deg, ${primaryColor}, ${accentColor}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">🎬 ${platformName}</div>`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <title>Welcome to ${platformName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
      <!-- Preheader text -->
      <div style="display: none; max-height: 0; overflow: hidden;">
        You've been invited to join ${platformName}${role === "admin" ? " as an Admin" : ""}. Set up your account to get started with automated TikTok to YouTube uploads.
      </div>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 560px; margin: 0 auto;">
              
              <!-- Header with Gradient -->
              <tr>
                <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); border-radius: 16px 16px 0 0; padding: 40px 40px 32px 40px; text-align: center;">
                  ${logoHtml}
                  <div style="color: rgba(255,255,255,0.9); font-size: 14px; margin-top: 12px; font-weight: 500;">
                    TikTok → YouTube Automation
                  </div>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                  
                  <!-- Welcome Message -->
                  <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${primaryColor};">
                    You're Invited! 🎉
                  </h1>
                  <div style="margin-bottom: 24px;">
                    ${roleBadge}
                  </div>
                  
                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #475569;">
                    Welcome! You've been invited to join <strong style="color: ${primaryColor};">${platformName}</strong>. 
                    Click the button below to set up your account and get started.
                  </p>
                  
                  <!-- CTA Button -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding: 16px 0 24px 0;">
                        <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.2);">
                          Set Up Your Account
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Features Section -->
                  <div style="margin: 28px 0;">
                    <div style="font-weight: 600; color: ${primaryColor}; margin-bottom: 16px; font-size: 14px;">✨ What you'll be able to do:</div>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="width: 28px; vertical-align: top;">
                                <div style="width: 20px; height: 20px; background: #dcfce7; border-radius: 50%; text-align: center; line-height: 20px; font-size: 12px;">✓</div>
                              </td>
                              <td style="font-size: 14px; color: #475569;">Connect your TikTok accounts</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="width: 28px; vertical-align: top;">
                                <div style="width: 20px; height: 20px; background: #dcfce7; border-radius: 50%; text-align: center; line-height: 20px; font-size: 12px;">✓</div>
                              </td>
                              <td style="font-size: 14px; color: #475569;">Automatically scrape and download videos</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="width: 28px; vertical-align: top;">
                                <div style="width: 20px; height: 20px; background: #dcfce7; border-radius: 50%; text-align: center; line-height: 20px; font-size: 12px;">✓</div>
                              </td>
                              <td style="font-size: 14px; color: #475569;">Schedule uploads to YouTube</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="width: 28px; vertical-align: top;">
                                <div style="width: 20px; height: 20px; background: #dcfce7; border-radius: 50%; text-align: center; line-height: 20px; font-size: 12px;">✓</div>
                              </td>
                              <td style="font-size: 14px; color: #475569;">Track analytics and performance</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <!-- Expiry Notice -->
                  <div style="background: #fef3c7; border-radius: 8px; padding: 14px 18px; margin: 24px 0; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0; font-size: 13px; color: #92400e;">
                      <strong>⏰ Note:</strong> This invitation expires in 7 days. Please accept it soon!
                    </p>
                  </div>
                  
                  <!-- Link fallback -->
                  <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${inviteUrl}" style="color: ${primaryColor}; word-break: break-all;">${inviteUrl}</a>
                  </p>
                  
                  <!-- Divider -->
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">
                  
                  <!-- Footer Note -->
                  <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.6;">
                    If you didn't expect this invitation, you can safely ignore this email.
                  </p>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 32px 40px; text-align: center;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: ${primaryColor};">
                    ${platformName}
                  </p>
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8;">
                    Powered by Digital Automators
                  </p>
                  <p style="margin: 16px 0 0 0; font-size: 11px; color: #cbd5e1;">
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

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is owner
    const { data: isOwner, error: ownerError } = await supabaseAdmin.rpc("is_owner", {
      _user_id: user.id,
    });

    if (ownerError || !isOwner) {
      throw new Error("Only owners can invite users");
    }

    // Parse request body
    const { email, role }: InviteRequest = await req.json();

    if (!email || !email.includes("@")) {
      throw new Error("Invalid email address");
    }

    if (role && !["user", "admin"].includes(role)) {
      throw new Error("Invalid role. Must be 'user' or 'admin'");
    }

    const assignRole = role || "user";

    console.log(`Owner ${user.email} inviting ${email} as ${assignRole}`);

    // Fetch branding settings from platform_settings
    const { data: brandingData } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value")
      .in("key", [
        "EMAIL_PLATFORM_NAME",
        "EMAIL_SENDER_NAME",
        "EMAIL_SENDER_ADDRESS",
        "EMAIL_LOGO_URL",
        "EMAIL_PRIMARY_COLOR",
        "EMAIL_ACCENT_COLOR",
      ]);

    const getBrandingSetting = (key: string, defaultValue: string): string => {
      const setting = brandingData?.find((s) => s.key === key);
      return setting?.value || defaultValue;
    };

    const branding: BrandingSettings = {
      platformName: getBrandingSetting("EMAIL_PLATFORM_NAME", "RepostFlow"),
      senderName: getBrandingSetting("EMAIL_SENDER_NAME", "RepostFlow"),
      senderAddress: getBrandingSetting("EMAIL_SENDER_ADDRESS", "notifications@repostflow.digitalautomators.com"),
      logoUrl: getBrandingSetting("EMAIL_LOGO_URL", ""),
      primaryColor: getBrandingSetting("EMAIL_PRIMARY_COLOR", "#18181b"),
      accentColor: getBrandingSetting("EMAIL_ACCENT_COLOR", "#3b82f6"),
    };

    console.log("Using branding:", branding);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabaseAdmin
      .from("pending_invitations")
      .select("*")
      .eq("email", email)
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      throw new Error("An invitation is already pending for this email");
    }

    // Get Resend API key - required for sending emails
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("Email service not configured. Please add RESEND_API_KEY.");
    }

    // Use production domain for redirect URL
    const PRODUCTION_URL = Deno.env.get("SITE_URL") || "https://repostflow.site";

    // Generate invite link WITHOUT sending Supabase's default email
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: email,
      options: {
        redirectTo: `${PRODUCTION_URL}/auth?type=invite`,
      },
    });

    if (linkError) {
      console.error("Supabase generateLink error:", linkError);
      throw new Error(`Failed to create invitation: ${linkError.message}`);
    }

    const inviteUrl = linkData.properties?.action_link;
    if (!inviteUrl) {
      throw new Error("Failed to generate invite link");
    }

    console.log("Invite link generated successfully");

    // Store pending invitation in database
    const { error: insertError } = await supabaseAdmin
      .from("pending_invitations")
      .insert({
        email,
        role: assignRole,
        invited_by: user.id,
        status: "pending",
      });

    if (insertError) {
      console.error("Failed to store invitation:", insertError);
      // Don't fail the request, continue with email
    }

    // If role is admin, pre-create the admin role
    if (assignRole === "admin" && linkData.user) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: linkData.user.id,
          role: "admin",
        });

      if (roleError) {
        console.log("Note: Could not pre-assign admin role:", roleError.message);
      }
    }

    // Send branded email via Resend (this is the ONLY email sent)
    const resend = new Resend(resendApiKey);
    
    const emailHtml = generateInviteEmailHtml({
      ...branding,
      role: assignRole,
      inviteUrl: inviteUrl,
    });

    const { error: emailError } = await resend.emails.send({
      from: `${branding.senderName} <${branding.senderAddress}>`,
      to: [email],
      subject: `🎬 You've been invited to ${branding.platformName}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Resend email error:", emailError);
      throw new Error("Failed to send invitation email");
    }

    console.log(`Invitation email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${email}`,
        userId: linkData.user?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Invite error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
