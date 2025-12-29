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
    senderEmail: settingsMap.get('EMAIL_SENDER_ADDRESS') || 'onboarding@resend.dev',
    logoUrl: settingsMap.get('EMAIL_LOGO_URL') || '',
    primaryColor: settingsMap.get('EMAIL_PRIMARY_COLOR') || '#18181b',
    accentColor: settingsMap.get('EMAIL_ACCENT_COLOR') || '#3b82f6',
  };
}

// Email templates for different urgency levels
function get7DayEmailHtml(userName: string, planName: string, expiryDate: string, branding: BrandingConfig): string {
  const logoHtml = branding.logoUrl 
    ? `<img src="${branding.logoUrl}" alt="${branding.platformName}" style="max-height: 40px; margin-bottom: 15px;" />`
    : '';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .warning-box { background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #6b7280; }
        .value { font-weight: 600; color: #111827; }
        .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoHtml}
          <h1>⚠️ Subscription Expiring Soon</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          
          <div class="warning-box">
            <strong>Your subscription will expire in 7 days!</strong>
          </div>
          
          <p>Your ${branding.platformName} subscription is about to expire. After expiration, you won't be able to add new accounts or run video scraping.</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Current Plan</span>
              <span class="value">${planName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Expires On</span>
              <span class="value">${expiryDate}</span>
            </div>
          </div>
          
          <p>To continue using ${branding.platformName} without interruption, please contact your administrator to renew your subscription.</p>
          
          <p>Thank you for using ${branding.platformName}!</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${branding.platformName}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function get3DayEmailHtml(userName: string, planName: string, expiryDate: string, branding: BrandingConfig): string {
  const logoHtml = branding.logoUrl 
    ? `<img src="${branding.logoUrl}" alt="${branding.platformName}" style="max-height: 40px; margin-bottom: 15px;" />`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .warning-box { background: #ffedd5; border: 2px solid #fb923c; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .impact-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .impact-list ul { margin: 0; padding-left: 20px; }
        .impact-list li { padding: 5px 0; color: #dc2626; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #6b7280; }
        .value { font-weight: 600; color: #111827; }
        .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoHtml}
          <h1>⏰ Only 3 Days Left!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          
          <div class="warning-box">
            <strong>⚠️ Your subscription is about to expire in just 3 days!</strong>
          </div>
          
          <p>Please renew now to continue using ${branding.platformName} without interruption.</p>
          
          <div class="impact-list">
            <p><strong>After expiration, you will lose access to:</strong></p>
            <ul>
              <li>Adding new TikTok accounts</li>
              <li>Video scraping functionality</li>
              <li>Automatic uploads to YouTube</li>
              <li>Scheduling features</li>
            </ul>
          </div>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Current Plan</span>
              <span class="value">${planName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Expires On</span>
              <span class="value">${expiryDate}</span>
            </div>
          </div>
          
          <p>Contact your administrator or support team immediately to avoid service interruption.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${branding.platformName}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function get1DayEmailHtml(userName: string, planName: string, expiryDate: string, branding: BrandingConfig): string {
  const logoHtml = branding.logoUrl 
    ? `<img src="${branding.logoUrl}" alt="${branding.platformName}" style="max-height: 40px; margin-bottom: 15px;" />`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .urgent-box { background: #fef2f2; border: 2px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .urgent-box h2 { color: #dc2626; margin: 0 0 10px 0; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #6b7280; }
        .value { font-weight: 600; color: #111827; }
        .cta { text-align: center; margin: 25px 0; }
        .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoHtml}
          <h1>🚨 URGENT: Expires Tomorrow!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          
          <div class="urgent-box">
            <h2>FINAL NOTICE</h2>
            <p>Your subscription expires <strong>TOMORROW</strong>!</p>
            <p>This is your last chance to renew before service interruption.</p>
          </div>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Current Plan</span>
              <span class="value">${planName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Expires On</span>
              <span class="value">${expiryDate}</span>
            </div>
          </div>
          
          <p style="text-align: center; font-weight: bold; color: #dc2626;">
            Contact support immediately to renew your subscription!
          </p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${branding.platformName}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getRenewalEmailHtml(userName: string, planName: string, accountCount: number, expiryDate: string, branding: BrandingConfig): string {
  const logoHtml = branding.logoUrl 
    ? `<img src="${branding.logoUrl}" alt="${branding.platformName}" style="max-height: 40px; margin-bottom: 15px;" />`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #6b7280; }
        .value { font-weight: 600; color: #111827; }
        .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoHtml}
          <h1>✅ Subscription Renewed!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Great news! Your subscription has been renewed and you're all set to continue using ${branding.platformName}.</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Plan</span>
              <span class="value">${planName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Account Limit</span>
              <span class="value">${accountCount} TikTok accounts</span>
            </div>
            <div class="detail-row">
              <span class="label">Valid Until</span>
              <span class="value">${expiryDate}</span>
            </div>
          </div>
          
          <p>If you have any questions, please contact your administrator.</p>
          <p>Happy uploading! 🚀</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${branding.platformName}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
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
        subject: "Your subscription has been renewed!",
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
        "⚠️ Your subscription expires in 7 days",
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
        "⚠️ Your subscription expires in 7 days",
        get7DayEmailHtml
      );

      // Check 3-day expiring subscriptions
      results.day3 = await sendExpiryNotifications(
        supabase,
        resend,
        branding,
        3,
        'notification_3day_sent_at',
        "⏰ Only 3 days left on your subscription!",
        get3DayEmailHtml
      );

      // Check 1-day expiring subscriptions
      results.day1 = await sendExpiryNotifications(
        supabase,
        resend,
        branding,
        1,
        'notification_1day_sent_at',
        "🚨 URGENT: Your subscription expires tomorrow!",
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
