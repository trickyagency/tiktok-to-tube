import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'check-expiring' | 'check-expiring-all' | 'renewal';
  userId?: string;
  planName?: string;
  accountCount?: number;
  expiresAt?: string;
}

interface ExpiringSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  expires_at: string;
  notification_sent_at: string | null;
  notification_3day_sent_at: string | null;
  notification_1day_sent_at: string | null;
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
                  <div style="font-size: 36px; margin: 12px 0 8px 0;">${headerIcon}</div>
                  <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: white;">${headerTitle}</h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="background: white; padding: 36px 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                  ${content}
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 32px 40px; text-align: center;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: ${branding.primaryColor};">
                    ${branding.platformName}
                  </p>
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8;">
                    Powered by Digital Automators
                  </p>
                  <p style="margin: 16px 0 0 0; font-size: 11px; color: #cbd5e1;">
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

// 7-Day Warning Email
function get7DayEmailHtml(userName: string, planName: string, expiryDate: string, branding: BrandingConfig): string {
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #475569;">
      Hi <strong>${userName}</strong>,
    </p>
    
    <!-- Warning Banner -->
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <div style="font-weight: 700; color: #92400e; font-size: 16px; margin-bottom: 4px;">
        ⚠️ Your subscription expires in 7 days
      </div>
      <div style="font-size: 14px; color: #a16207;">
        Renew now to avoid service interruption
      </div>
    </div>
    
    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.7; color: #475569;">
      Your ${branding.platformName} subscription is about to expire. After expiration, you won't be able to add new accounts or run video scraping.
    </p>
    
    <!-- Subscription Details Card -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e2e8f0;">
      <div style="font-weight: 600; color: ${branding.primaryColor}; margin-bottom: 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
        📋 Subscription Details
      </div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 14px;">Current Plan</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
            <span style="font-weight: 600; color: ${branding.primaryColor}; font-size: 14px;">${planName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">
            <span style="color: #64748b; font-size: 14px;">Expires On</span>
          </td>
          <td style="padding: 10px 0; text-align: right;">
            <span style="font-weight: 600; color: #f59e0b; font-size: 14px;">${expiryDate}</span>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.7; color: #475569;">
      To continue using ${branding.platformName} without interruption, please contact your administrator to renew your subscription.
    </p>
    
    <p style="margin: 24px 0 0 0; font-size: 15px; color: #475569;">
      Thank you for using ${branding.platformName}! 🎬
    </p>
  `;

  return generateEmailWrapper(
    branding,
    '⚠️',
    'Subscription Expiring Soon',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    content,
    `Your ${branding.platformName} subscription expires in 7 days. Renew now to avoid service interruption.`
  );
}

// 3-Day Warning Email
function get3DayEmailHtml(userName: string, planName: string, expiryDate: string, branding: BrandingConfig): string {
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #475569;">
      Hi <strong>${userName}</strong>,
    </p>
    
    <!-- Urgent Warning Banner -->
    <div style="background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%); border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #ea580c;">
      <div style="font-weight: 700; color: #c2410c; font-size: 18px; margin-bottom: 4px;">
        ⏰ Only 3 Days Left!
      </div>
      <div style="font-size: 14px; color: #ea580c;">
        Your subscription is about to expire
      </div>
    </div>
    
    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.7; color: #475569;">
      Please renew now to continue using ${branding.platformName} without interruption.
    </p>
    
    <!-- What You'll Lose Section -->
    <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #fecaca;">
      <div style="font-weight: 600; color: #dc2626; margin-bottom: 16px; font-size: 14px;">
        🚫 After expiration, you will lose access to:
      </div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 6px 0;">
            <span style="color: #b91c1c; font-size: 14px;">• Adding new TikTok accounts</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">
            <span style="color: #b91c1c; font-size: 14px;">• Video scraping functionality</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">
            <span style="color: #b91c1c; font-size: 14px;">• Automatic uploads to YouTube</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">
            <span style="color: #b91c1c; font-size: 14px;">• Scheduling features</span>
          </td>
        </tr>
      </table>
    </div>
    
    <!-- Subscription Details Card -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e2e8f0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 14px;">Current Plan</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
            <span style="font-weight: 600; color: ${branding.primaryColor}; font-size: 14px;">${planName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">
            <span style="color: #64748b; font-size: 14px;">Expires On</span>
          </td>
          <td style="padding: 10px 0; text-align: right;">
            <span style="font-weight: 600; color: #ea580c; font-size: 14px;">${expiryDate}</span>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #475569; font-weight: 500;">
      Contact your administrator or support team immediately to avoid service interruption.
    </p>
  `;

  return generateEmailWrapper(
    branding,
    '⏰',
    'Only 3 Days Left!',
    'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    content,
    `URGENT: Your ${branding.platformName} subscription expires in just 3 days! Renew now.`
  );
}

// 1-Day Final Warning Email
function get1DayEmailHtml(userName: string, planName: string, expiryDate: string, branding: BrandingConfig): string {
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #475569;">
      Hi <strong>${userName}</strong>,
    </p>
    
    <!-- Critical Warning Banner -->
    <div style="background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%); border-radius: 12px; padding: 24px; margin: 20px 0; border: 2px solid #ef4444; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 12px;">🚨</div>
      <div style="font-weight: 800; color: #b91c1c; font-size: 24px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">
        FINAL NOTICE
      </div>
      <div style="font-size: 16px; color: #dc2626; font-weight: 600;">
        Your subscription expires <strong>TOMORROW</strong>!
      </div>
      <div style="font-size: 14px; color: #b91c1c; margin-top: 8px;">
        This is your last chance to renew before service interruption.
      </div>
    </div>
    
    <!-- Subscription Details Card -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e2e8f0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 14px;">Current Plan</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
            <span style="font-weight: 600; color: ${branding.primaryColor}; font-size: 14px;">${planName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">
            <span style="color: #64748b; font-size: 14px;">Expires On</span>
          </td>
          <td style="padding: 10px 0; text-align: right;">
            <span style="font-weight: 700; color: #dc2626; font-size: 14px;">${expiryDate}</span>
          </td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; padding: 20px 0;">
      <p style="margin: 0; font-size: 16px; font-weight: 700; color: #dc2626;">
        ⚡ Contact support immediately to renew your subscription!
      </p>
    </div>
  `;

  return generateEmailWrapper(
    branding,
    '🚨',
    'URGENT: Expires Tomorrow!',
    'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    content,
    `CRITICAL: Your ${branding.platformName} subscription expires TOMORROW! This is your final notice.`
  );
}

// Renewal Confirmation Email
function getRenewalEmailHtml(userName: string, planName: string, accountCount: number, expiryDate: string, branding: BrandingConfig): string {
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #475569;">
      Hi <strong>${userName}</strong>,
    </p>
    
    <!-- Success Banner -->
    <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; padding: 24px; margin: 20px 0; border: 1px solid #86efac; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
      <div style="font-weight: 700; color: #166534; font-size: 20px; margin-bottom: 4px;">
        Subscription Renewed Successfully!
      </div>
      <div style="font-size: 14px; color: #15803d;">
        You're all set to continue using ${branding.platformName}
      </div>
    </div>
    
    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.7; color: #475569;">
      Great news! Your subscription has been renewed and you're all set to continue using ${branding.platformName}.
    </p>
    
    <!-- Subscription Details Card -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e2e8f0;">
      <div style="font-weight: 600; color: ${branding.primaryColor}; margin-bottom: 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
        ✅ Your Subscription
      </div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 14px;">Plan</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
            <span style="font-weight: 600; color: ${branding.primaryColor}; font-size: 14px;">${planName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 14px;">Account Limit</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
            <span style="font-weight: 600; color: ${branding.primaryColor}; font-size: 14px;">${accountCount} TikTok accounts</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">
            <span style="color: #64748b; font-size: 14px;">Valid Until</span>
          </td>
          <td style="padding: 10px 0; text-align: right;">
            <span style="font-weight: 600; color: #16a34a; font-size: 14px;">${expiryDate}</span>
          </td>
        </tr>
      </table>
    </div>
    
    <!-- Features Reminder -->
    <div style="margin: 28px 0;">
      <div style="font-weight: 600; color: ${branding.primaryColor}; margin-bottom: 16px; font-size: 14px;">
        🚀 Continue enjoying these features:
      </div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 8px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="width: 28px; vertical-align: top;">
                  <div style="width: 20px; height: 20px; background: #dcfce7; border-radius: 50%; text-align: center; line-height: 20px; font-size: 12px;">✓</div>
                </td>
                <td style="font-size: 14px; color: #475569;">Unlimited video scraping</td>
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
                <td style="font-size: 14px; color: #475569;">Automatic YouTube uploads</td>
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
                <td style="font-size: 14px; color: #475569;">Advanced scheduling</td>
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
                <td style="font-size: 14px; color: #475569;">Detailed analytics</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #475569;">
      If you have any questions, please contact your administrator.
    </p>
    
    <p style="margin: 0; font-size: 16px; color: #475569;">
      Happy uploading! 🚀
    </p>
  `;

  return generateEmailWrapper(
    branding,
    '✅',
    'Subscription Renewed!',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    content,
    `Great news! Your ${branding.platformName} subscription has been renewed. You're all set to continue!`
  );
}

async function sendExpiryNotifications(
  supabase: any,
  resend: Resend,
  branding: BrandingConfig,
  daysOut: number,
  notificationField: 'notification_sent_at' | 'notification_3day_sent_at' | 'notification_1day_sent_at',
  emailSubject: string,
  getEmailHtml: (userName: string, planName: string, expiryDate: string, branding: BrandingConfig) => string
): Promise<number> {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysOut);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + daysOut - 1);

  console.log(`Checking for subscriptions expiring in ${daysOut} days (${startDate.toISOString()} to ${targetDate.toISOString()})`);

  const { data: expiringSubscriptions, error: fetchError } = await supabase
    .from('user_subscriptions')
    .select('id, user_id, plan_id, expires_at, notification_sent_at, notification_3day_sent_at, notification_1day_sent_at')
    .eq('status', 'active')
    .gte('expires_at', startDate.toISOString())
    .lte('expires_at', targetDate.toISOString())
    .is(notificationField, null);

  if (fetchError) {
    console.error(`Failed to fetch ${daysOut}-day expiring subscriptions:`, fetchError);
    return 0;
  }

  console.log(`Found ${expiringSubscriptions?.length || 0} subscriptions expiring in ${daysOut} days`);

  if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
    return 0;
  }

  // Get plan names
  const planIds = [...new Set(expiringSubscriptions.map((s: ExpiringSubscription) => s.plan_id))];
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name')
    .in('id', planIds);
  const planMap = new Map<string, string>(
    plans?.map((p: { id: string; name: string }) => [p.id, p.name] as [string, string]) || []
  );

  // Get user emails
  const userIds = expiringSubscriptions.map((s: ExpiringSubscription) => s.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, email, full_name')
    .in('user_id', userIds);
  const profileMap = new Map<string, { user_id: string; email: string; full_name: string | null }>(
    profiles?.map((p: { user_id: string; email: string; full_name: string | null }) => [p.user_id, p]) || []
  );

  let notifiedCount = 0;
  const fromEmail = `${branding.senderName} <${branding.senderEmail}>`;

  for (const sub of expiringSubscriptions as ExpiringSubscription[]) {
    const profile = profileMap.get(sub.user_id);
    if (!profile) {
      console.warn(`No profile found for user ${sub.user_id}`);
      continue;
    }

    const userName = profile.full_name || profile.email.split('@')[0];
    const planName = planMap.get(sub.plan_id) || 'Your Plan';
    const expiryDate = new Date(sub.expires_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    try {
      const emailResponse = await resend.emails.send({
        from: fromEmail,
        to: [profile.email],
        subject: emailSubject,
        html: getEmailHtml(userName, planName, expiryDate, branding),
      });

      console.log(`${daysOut}-day warning sent to ${profile.email}:`, emailResponse);

      // Mark as notified
      await supabase
        .from('user_subscriptions')
        .update({ [notificationField]: new Date().toISOString() })
        .eq('id', sub.id);

      notifiedCount++;
    } catch (emailError) {
      console.error(`Failed to send email to ${profile.email}:`, emailError);
    }
  }

  return notifiedCount;
}

const handler = async (req: Request): Promise<Response> => {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load branding configuration
    const branding = await getBrandingConfig(supabase);
    console.log(`Using branding: ${branding.platformName} <${branding.senderEmail}>`);

    const { type, userId, planName, accountCount, expiresAt }: NotificationRequest = await req.json();
    console.log(`Processing notification request: type=${type}, userId=${userId}`);

    const fromEmail = `${branding.senderName} <${branding.senderEmail}>`;

    // Handle renewal confirmation emails
    if (type === 'renewal') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId required for renewal notification" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get user email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile) {
        console.error("Failed to fetch user profile:", profileError);
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const userName = profile.full_name || profile.email.split('@')[0];
      const formattedExpiry = expiresAt
        ? new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'No expiry date set';

      const emailResponse = await resend.emails.send({
        from: fromEmail,
        to: [profile.email],
        subject: "🎉 Your subscription has been renewed!",
        html: getRenewalEmailHtml(userName, planName || 'Active Plan', accountCount || 0, formattedExpiry, branding),
      });

      console.log("Renewal email sent:", emailResponse);

      // Reset all notification flags for the renewed subscription
      const { error: resetError } = await supabase
        .from('user_subscriptions')
        .update({
          notification_sent_at: null,
          notification_3day_sent_at: null,
          notification_1day_sent_at: null
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (resetError) {
        console.warn("Failed to reset notification flags:", resetError);
      }

      return new Response(
        JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Handle single interval check (backward compatibility)
    if (type === 'check-expiring') {
      const notified = await sendExpiryNotifications(
        supabase,
        resend,
        branding,
        7,
        'notification_sent_at',
        "⚠️ Your RepostFlow subscription expires in 7 days",
        get7DayEmailHtml
      );

      return new Response(
        JSON.stringify({ success: true, notified }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Handle all interval checks (new comprehensive check)
    if (type === 'check-expiring-all') {
      console.log("Running comprehensive expiry notification check...");
      
      const results = {
        day7: 0,
        day3: 0,
        day1: 0,
      };

      // Check 7-day expiring subscriptions
      results.day7 = await sendExpiryNotifications(
        supabase,
        resend,
        branding,
        7,
        'notification_sent_at',
        "⚠️ Your RepostFlow subscription expires in 7 days",
        get7DayEmailHtml
      );

      // Check 3-day expiring subscriptions
      results.day3 = await sendExpiryNotifications(
        supabase,
        resend,
        branding,
        3,
        'notification_3day_sent_at',
        "⏰ Only 3 days left on your RepostFlow subscription!",
        get3DayEmailHtml
      );

      // Check 1-day expiring subscriptions
      results.day1 = await sendExpiryNotifications(
        supabase,
        resend,
        branding,
        1,
        'notification_1day_sent_at',
        "🚨 URGENT: Your RepostFlow subscription expires tomorrow!",
        get1DayEmailHtml
      );

      const totalNotified = results.day7 + results.day3 + results.day1;
      console.log(`Notification check complete: 7-day=${results.day7}, 3-day=${results.day3}, 1-day=${results.day1}, total=${totalNotified}`);

      return new Response(
        JSON.stringify({ success: true, results, totalNotified }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid notification type" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in subscription-notifications:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};


serve(handler);
