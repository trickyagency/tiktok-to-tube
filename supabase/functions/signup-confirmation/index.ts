import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
}

interface BrandingSettings {
  platform_name: string;
  primary_color: string;
  logo_url: string | null;
}

const generateConfirmationEmailHtml = (
  confirmUrl: string,
  userName: string,
  branding: BrandingSettings
) => {
  const platformName = branding.platform_name || 'RepostFlow';
  const primaryColor = branding.primary_color || '#8B5CF6';
  const logoUrl = branding.logo_url;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email - ${platformName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, #6366f1 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${platformName}" style="height: 50px; margin-bottom: 16px;">` : ''}
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${platformName}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Welcome aboard! 🎉</p>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 30px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 22px; font-weight: 600;">
                Hey ${userName || 'there'}! 👋
              </h2>
              <p style="color: #52525b; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                Thanks for signing up for ${platformName}! We're excited to have you on board. 
                Please confirm your email address by clicking the button below:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${confirmUrl}" style="display: inline-block; background: linear-gradient(135deg, ${primaryColor} 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">
                      Confirm Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- What's next -->
              <div style="background-color: #f4f4f5; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #18181b; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                  What's next?
                </h3>
                <ul style="color: #52525b; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                  <li>Connect your TikTok accounts</li>
                  <li>Link your YouTube channels</li>
                  <li>Set up automated schedules</li>
                  <li>Start growing your audience!</li>
                </ul>
              </div>
              
              <!-- Security notice -->
              <p style="color: #a1a1aa; margin: 24px 0 0 0; font-size: 13px; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${confirmUrl}" style="color: ${primaryColor}; word-break: break-all;">${confirmUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #18181b; padding: 30px; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">
                This email was sent by ${platformName}
              </p>
              <p style="color: #71717a; margin: 0; font-size: 12px;">
                If you didn't create an account, you can safely ignore this email.
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const siteUrl = Deno.env.get('SITE_URL') || 'https://repostflow.digitalautomators.com';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, password, fullName }: SignupRequest = await req.json();

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    console.log(`Processing signup for: ${email}`);

    // Check if user already exists by trying to get user list with email filter
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = usersList?.users?.find(u => u.email === email);
    if (existingUser) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    // Create user with email_confirm: false so we can send our own email
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw new Error(createError.message);
    }

    console.log(`User created: ${createData.user.id}`);

    // Generate confirmation link (signup type requires password)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (linkError) {
      console.error('Error generating confirmation link:', linkError);
      throw new Error('Failed to generate confirmation link');
    }

    const confirmUrl = linkData.properties?.action_link;
    if (!confirmUrl) {
      throw new Error('Failed to generate confirmation URL');
    }

    console.log('Confirmation link generated');

    // Fetch branding settings
    let branding: BrandingSettings = {
      platform_name: 'RepostFlow',
      primary_color: '#8B5CF6',
      logo_url: null,
    };

    const { data: settingsData } = await supabaseAdmin
      .from('platform_settings')
      .select('key, value')
      .in('key', ['platform_name', 'primary_color', 'logo_url']);

    if (settingsData) {
      settingsData.forEach((setting) => {
        if (setting.key === 'platform_name' && setting.value) {
          branding.platform_name = setting.value;
        } else if (setting.key === 'primary_color' && setting.value) {
          branding.primary_color = setting.value;
        } else if (setting.key === 'logo_url' && setting.value) {
          branding.logo_url = setting.value;
        }
      });
    }

    // Send confirmation email via Resend
    const resend = new Resend(resendApiKey);

    const emailHtml = generateConfirmationEmailHtml(confirmUrl, fullName, branding);

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `${branding.platform_name} <notifications@repostflow.digitalautomators.com>`,
      to: [email],
      subject: `Confirm your email - ${branding.platform_name}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending confirmation email:', emailError);
      throw new Error('Failed to send confirmation email');
    }

    console.log('Confirmation email sent:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account created. Please check your email to confirm your account.' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in signup-confirmation function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
