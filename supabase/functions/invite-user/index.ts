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

function generateInviteEmailHtml(options: BrandingSettings & { role: string }): string {
  const { platformName, logoUrl, primaryColor, accentColor, role } = options;
  
  const logoHtml = logoUrl 
    ? `<img src="${logoUrl}" alt="${platformName}" style="max-height: 48px; margin-bottom: 24px;" />`
    : `<div style="color: ${primaryColor}; font-size: 24px; font-weight: 700; margin-bottom: 24px;">${platformName}</div>`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        ${logoHtml}
        <h1 style="color: ${primaryColor}; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Welcome to ${platformName}!</h1>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          You've been invited to join ${platformName}${role === "admin" ? " as an Admin" : ""}. 
          Click the button below to set up your account.
        </p>
        <p style="color: #71717a; font-size: 14px; margin: 0 0 24px 0;">
          Check your email for a separate message from Supabase with your account setup link.
        </p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="color: #52525b; font-size: 14px; margin: 0;">
            <strong>Note:</strong> This invitation expires in 7 days.
          </p>
        </div>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
        <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
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
      senderAddress: getBrandingSetting("EMAIL_SENDER_ADDRESS", "onboarding@resend.dev"),
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

    // Get the origin for redirect URL
    const origin = req.headers.get("origin") || "https://qpufyeeqosvgipslwday.lovableproject.com";

    // Generate invite using Supabase Auth Admin API
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${origin}/auth?type=invite`,
      }
    );

    if (inviteError) {
      console.error("Supabase invite error:", inviteError);
      throw new Error(`Failed to create invitation: ${inviteError.message}`);
    }

    console.log("Supabase invite created:", inviteData);

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
      // Don't fail the request, the Supabase invite was already sent
    }

    // If role is admin, we need to add the role when user accepts
    // Store this info so we can process it when user signs up
    if (assignRole === "admin" && inviteData.user) {
      // Pre-create the admin role so it's ready when user accepts
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: inviteData.user.id,
          role: "admin",
        });

      if (roleError) {
        console.log("Note: Could not pre-assign admin role:", roleError.message);
      }
    }

    // Send custom branded email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const emailHtml = generateInviteEmailHtml({
          ...branding,
          role: assignRole,
        });

        await resend.emails.send({
          from: `${branding.senderName} <${branding.senderAddress}>`,
          to: [email],
          subject: `You've been invited to ${branding.platformName}`,
          html: emailHtml,
        });

        console.log("Custom branded email sent via Resend");
      } catch (emailError) {
        console.error("Resend email failed (non-critical):", emailError);
        // Don't fail the request, the Supabase invite email was already sent
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${email}`,
        userId: inviteData.user?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Invite error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
