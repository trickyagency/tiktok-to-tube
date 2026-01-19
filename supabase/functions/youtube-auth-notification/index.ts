import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  channelId: string;
  userId: string;
  channelName: string;
  tiktokUsername?: string;
  issueType: 'token_revoked' | 'api_not_enabled' | 'auth_failed' | 'quota_exceeded' | 'credentials_invalid';
}

interface BrandingConfig {
  platformName: string;
  senderName: string;
  senderEmail: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
}

// Get branding configuration from platform_settings
async function getBrandingConfig(supabase: any): Promise<BrandingConfig> {
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('key, value')
    .in('key', [
      'EMAIL_PLATFORM_NAME',
      'EMAIL_SENDER_NAME', 
      'EMAIL_SENDER_ADDRESS',
      'EMAIL_LOGO_URL',
      'EMAIL_PRIMARY_COLOR',
      'EMAIL_ACCENT_COLOR'
    ]);

  const settingsMap = new Map<string, string>(
    settings?.map((s: { key: string; value: string | null }) => [s.key, s.value || '']) || []
  );

  return {
    platformName: settingsMap.get('EMAIL_PLATFORM_NAME') || 'RepostFlow',
    senderName: settingsMap.get('EMAIL_SENDER_NAME') || 'RepostFlow',
    senderEmail: settingsMap.get('EMAIL_SENDER_ADDRESS') || 'notifications@repostflow.digitalautomators.com',
    logoUrl: settingsMap.get('EMAIL_LOGO_URL') || '',
    primaryColor: settingsMap.get('EMAIL_PRIMARY_COLOR') || '#18181b',
    accentColor: settingsMap.get('EMAIL_ACCENT_COLOR') || '#3b82f6',
  };
}

// Generate email wrapper with consistent branding
function generateEmailWrapper(
  branding: BrandingConfig, 
  headerIcon: string, 
  headerTitle: string, 
  headerGradient: string, 
  content: string,
  preheaderText: string
): string {
  const logoHtml = branding.logoUrl 
    ? `<img src="${branding.logoUrl}" alt="${branding.platformName}" style="max-height: 40px; margin-bottom: 12px;" />`
    : `<div style="font-size: 24px; font-weight: 800; color: white; margin-bottom: 8px;">🎬 ${branding.platformName}</div>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <title>${headerTitle}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
      <!-- Preheader text -->
      <div style="display: none; max-height: 0; overflow: hidden;">
        ${preheaderText}
      </div>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 560px; margin: 0 auto;">
              
              <!-- Header with Gradient -->
              <tr>
                <td style="background: ${headerGradient}; border-radius: 16px 16px 0 0; padding: 36px 40px 28px 40px; text-align: center;">
                  ${logoHtml}
                  <div style="font-size: 48px; margin-bottom: 12px;">${headerIcon}</div>
                  <div style="font-size: 22px; font-weight: 700; color: white; line-height: 1.3;">${headerTitle}</div>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="background-color: white; padding: 36px 40px 40px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                  ${content}
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 28px 40px; text-align: center;">
                  <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;">
                    You're receiving this because you have YouTube authorization notifications enabled.
                  </p>
                  <p style="margin: 0; color: #94a3b8; font-size: 12px;">
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
}

// Helper to generate affected accounts section
function getAffectedAccountsHtml(channelName: string, tiktokUsername?: string): string {
  return `
    <div style="background: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; color: #334155; font-size: 14px; font-weight: 600;">Affected Accounts:</p>
      <p style="margin: 0 0 4px 0; color: #475569; font-size: 14px;">📺 YouTube: <strong>${channelName}</strong></p>
      <p style="margin: 0; color: #475569; font-size: 14px;">🎵 TikTok Source: <strong>${tiktokUsername ? '@' + tiktokUsername : 'Not linked'}</strong></p>
    </div>
  `;
}

function getIssueDetails(issueType: string, channelName: string, siteUrl: string, tiktokUsername?: string) {
  const affectedAccountsHtml = getAffectedAccountsHtml(channelName, tiktokUsername);
  
  switch (issueType) {
    case 'token_revoked':
      return {
        headerIcon: '⚠️',
        headerTitle: 'YouTube Authorization Revoked',
        headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
        subject: `Action Required: YouTube Channel "${channelName}" Authorization Revoked`,
        preheader: `Your YouTube channel authorization was revoked. Re-authorize to continue uploading.`,
        content: `
          <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
            Your YouTube channel <strong>"${channelName}"</strong> has had its authorization revoked. 
            This can happen when you change your Google password, revoke app permissions, or the refresh token expires.
          </p>
          
          ${affectedAccountsHtml}
          
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">
              ⚠️ Video uploads to this channel will fail until you re-authorize.
            </p>
          </div>
          
          <p style="margin: 24px 0 16px 0; color: #475569; font-size: 15px; font-weight: 600;">
            How to fix this:
          </p>
          
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
              <span style="background: ${siteUrl ? '#3b82f6' : '#64748b'}; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">1</span>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">Go to your YouTube Channels page in the dashboard</span>
            </div>
            <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
              <span style="background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">2</span>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">Find the channel showing "Authorization Revoked"</span>
            </div>
            <div style="display: flex; align-items: flex-start;">
              <span style="background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">3</span>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">Click "Re-authorize" or "Update Credentials" if needed</span>
            </div>
          </div>
          
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center;">
                <a href="${siteUrl}/dashboard/youtube" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                  Fix Authorization Now →
                </a>
              </td>
            </tr>
          </table>
        `,
      };

    case 'api_not_enabled':
      return {
        headerIcon: '🔧',
        headerTitle: 'YouTube API Not Enabled',
        headerGradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #9a3412 100%)',
        subject: `Setup Required: Enable YouTube Data API for "${channelName}"`,
        preheader: `YouTube Data API v3 is not enabled for your channel. Enable it to connect.`,
        content: `
          <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
            We couldn't connect your YouTube channel <strong>"${channelName}"</strong> because the YouTube Data API v3 
            is not enabled in your Google Cloud project.
          </p>
          
          ${affectedAccountsHtml}
          
          <div style="background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%); border-left: 4px solid #ea580c; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #9a3412; font-size: 14px; font-weight: 600;">
              🔧 The YouTube Data API v3 must be enabled to upload videos.
            </p>
          </div>
          
          <p style="margin: 24px 0 16px 0; color: #475569; font-size: 15px; font-weight: 600;">
            How to fix this:
          </p>
          
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
              <span style="background: #ea580c; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">1</span>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">Open the <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" style="color: #3b82f6;">YouTube Data API v3</a> page in Google Cloud Console</span>
            </div>
            <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
              <span style="background: #ea580c; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">2</span>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">Click the "Enable" button</span>
            </div>
            <div style="display: flex; align-items: flex-start;">
              <span style="background: #ea580c; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">3</span>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">Return to the dashboard and click "Re-authorize" on the channel</span>
            </div>
          </div>
          
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center; padding-bottom: 12px;">
                <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.4);">
                  Open Google Cloud Console →
                </a>
              </td>
            </tr>
            <tr>
              <td style="text-align: center;">
                <a href="${siteUrl}/dashboard/youtube" style="display: inline-block; background: white; border: 2px solid #e2e8f0; color: #475569; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px;">
                  Go to YouTube Channels
                </a>
              </td>
            </tr>
          </table>
        `,
      };
      
    case 'credentials_invalid':
      return {
        headerIcon: '🔑',
        headerTitle: 'Google Cloud Credentials Invalid',
        headerGradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
        subject: `Action Required: YouTube Channel "${channelName}" Credentials Invalid`,
        preheader: `Your Google Cloud OAuth credentials are invalid or deleted. Update them to continue uploading.`,
        content: `
          <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
            We couldn't authenticate your YouTube channel <strong>"${channelName}"</strong> because the Google Cloud 
            OAuth credentials (Client ID or Client Secret) are invalid or have been deleted.
          </p>
          
          ${affectedAccountsHtml}
          
          <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #dc2626; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">
              🔑 Your OAuth Client ID or Client Secret is incorrect or no longer exists.
            </p>
          </div>
          
          <p style="margin: 24px 0 16px 0; color: #475569; font-size: 15px; font-weight: 600;">
            How to fix this:
          </p>
          
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
              <span style="background: #dc2626; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">1</span>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">Go to <a href="https://console.cloud.google.com/apis/credentials" style="color: #3b82f6;">Google Cloud Console → APIs & Services → Credentials</a></span>
            </div>
            <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
              <span style="background: #dc2626; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">2</span>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">Verify your OAuth 2.0 Client ID exists and note the Client ID and Client Secret</span>
            </div>
            <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
              <span style="background: #dc2626; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">3</span>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">Go to YouTube Channels in your dashboard and click "Edit Credentials"</span>
            </div>
            <div style="display: flex; align-items: flex-start;">
              <span style="background: #dc2626; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">4</span>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">Update the credentials and click "Re-authorize"</span>
            </div>
          </div>
          
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center; padding-bottom: 12px;">
                <a href="https://console.cloud.google.com/apis/credentials" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">
                  Open Google Cloud Console →
                </a>
              </td>
            </tr>
            <tr>
              <td style="text-align: center;">
                <a href="${siteUrl}/dashboard/youtube" style="display: inline-block; background: white; border: 2px solid #e2e8f0; color: #475569; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px;">
                  Go to YouTube Channels
                </a>
              </td>
            </tr>
          </table>
        `,
      };

    case 'auth_failed':
    default:
      return {
        headerIcon: '❌',
        headerTitle: 'YouTube Authorization Failed',
        headerGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
        subject: `Action Required: YouTube Channel "${channelName}" Authorization Failed`,
        preheader: `There was an issue authorizing your YouTube channel. Please re-authorize.`,
        content: `
          <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
            We encountered an issue while trying to authorize your YouTube channel <strong>"${channelName}"</strong>.
          </p>
          
          ${affectedAccountsHtml}
          
          <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #ef4444; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">
              ❌ Video uploads to this channel will fail until you fix the authorization.
            </p>
          </div>
          
          <p style="margin: 24px 0 16px 0; color: #475569; font-size: 15px; font-weight: 600;">
            How to fix this:
          </p>
          
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
              <span style="background: #ef4444; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">1</span>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">Go to your YouTube Channels page</span>
            </div>
            <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
              <span style="background: #ef4444; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">2</span>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">Check if your Google Cloud credentials are correct</span>
            </div>
            <div style="display: flex; align-items: flex-start;">
              <span style="background: #ef4444; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">3</span>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">Click "Re-authorize" or "Update Credentials"</span>
            </div>
          </div>
          
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center;">
                <a href="${siteUrl}/dashboard/youtube" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);">
                  Fix Authorization Now →
                </a>
              </td>
            </tr>
          </table>
        `,
      };

    case 'quota_exceeded':
      return {
        headerIcon: '📊',
        headerTitle: 'YouTube API Quota Exceeded',
        headerGradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
        subject: `Notice: YouTube Channel "${channelName}" Quota Exceeded`,
        preheader: `Your YouTube API quota has been exceeded. Uploads will resume when quota resets.`,
        content: `
          <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
            The YouTube API quota for channel <strong>"${channelName}"</strong> has been exceeded.
          </p>
          
          ${affectedAccountsHtml}
          
          <div style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); border-left: 4px solid #8b5cf6; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #5b21b6; font-size: 14px; font-weight: 600;">
              📊 Video uploads will automatically resume when the quota resets at midnight Pacific Time.
            </p>
          </div>
          
          <p style="margin: 24px 0 16px 0; color: #475569; font-size: 15px; font-weight: 600;">
            What does this mean?
          </p>
          
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="margin-bottom: 12px;">
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">• YouTube limits API usage per day (typically 10,000 units)</span>
            </div>
            <div style="margin-bottom: 12px;">
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">• Each video upload costs approximately 1,600 quota units</span>
            </div>
            <div>
              <span style="color: #475569; font-size: 14px; line-height: 1.5;">• Quota resets daily at midnight Pacific Time (PT)</span>
            </div>
          </div>
          
          <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
            No action is required. Pending uploads will be processed automatically when quota becomes available.
          </p>
          
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center;">
                <a href="${siteUrl}/dashboard/youtube" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">
                  View Channel Status →
                </a>
              </td>
            </tr>
          </table>
        `,
      };
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log('YouTube auth notification function called');

  // Handle CORS preflight requests
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

    const resend = new Resend(resendApiKey);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { channelId, userId, channelName, tiktokUsername, issueType }: NotificationRequest = await req.json();

    console.log(`Processing ${issueType} notification for channel: ${channelName}, tiktok: ${tiktokUsername || 'none'}, user: ${userId}`);

    // Fetch user's email from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.email) {
      console.error('Could not find user profile:', profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get branding configuration
    const branding = await getBrandingConfig(supabase);
    
    // Get site URL for links
    const siteUrl = Deno.env.get("SITE_URL") || 'https://tik-to-tube-sync.lovable.app';

    // Get issue-specific email content (now with tiktokUsername)
    const issueDetails = getIssueDetails(issueType, channelName, siteUrl, tiktokUsername);

    // Generate the full email HTML
    const emailHtml = generateEmailWrapper(
      branding,
      issueDetails.headerIcon,
      issueDetails.headerTitle,
      issueDetails.headerGradient,
      issueDetails.content,
      issueDetails.preheader
    );

    // Send the email
    console.log(`Sending ${issueType} notification email to ${profile.email}`);
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${branding.senderName} <${branding.senderEmail}>`,
      to: [profile.email],
      subject: issueDetails.subject,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Failed to send email:', emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Email sent successfully:`, emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${issueType} notification sent to ${profile.email}`,
        emailId: emailData?.id 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in youtube-auth-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
