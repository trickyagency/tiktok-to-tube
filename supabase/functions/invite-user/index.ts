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
        
        await resend.emails.send({
          from: "TrickyHub <onboarding@resend.dev>",
          to: [email],
          subject: "You've been invited to TrickyHub",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
              <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Welcome to TrickyHub!</h1>
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  You've been invited to join TrickyHub${assignRole === "admin" ? " as an Admin" : ""}. 
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
          `,
        });

        console.log("Custom email sent via Resend");
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
