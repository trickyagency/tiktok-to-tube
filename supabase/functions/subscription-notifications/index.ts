import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'check-expiring' | 'renewal';
  userId?: string;
  planName?: string;
  accountCount?: number;
  expiresAt?: string;
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

    const { type, userId, planName, accountCount, expiresAt }: NotificationRequest = await req.json();
    console.log(`Processing notification request: type=${type}, userId=${userId}`);

    if (type === 'renewal') {
      // Send renewal confirmation email
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
        from: "TikTube <onboarding@resend.dev>",
        to: [profile.email],
        subject: "Your subscription has been renewed!",
        html: `
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
                <h1>✅ Subscription Renewed!</h1>
              </div>
              <div class="content">
                <p>Hi ${userName},</p>
                <p>Great news! Your subscription has been renewed and you're all set to continue using TikTube.</p>
                
                <div class="details">
                  <div class="detail-row">
                    <span class="label">Plan</span>
                    <span class="value">${planName || 'Active Plan'}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Account Limit</span>
                    <span class="value">${accountCount || 0} TikTok accounts</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Valid Until</span>
                    <span class="value">${formattedExpiry}</span>
                  </div>
                </div>
                
                <p>If you have any questions, please contact your administrator.</p>
                <p>Happy uploading! 🚀</p>
              </div>
              <div class="footer">
                <p>This is an automated message from TikTube.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log("Renewal email sent:", emailResponse);
      return new Response(
        JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (type === 'check-expiring') {
      // Find subscriptions expiring in 7 days that haven't been notified
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      const sixDaysFromNow = new Date();
      sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);

      const { data: expiringSubscriptions, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('id, user_id, plan_id, expires_at, notification_sent_at')
        .eq('status', 'active')
        .gte('expires_at', sixDaysFromNow.toISOString())
        .lte('expires_at', sevenDaysFromNow.toISOString())
        .is('notification_sent_at', null);

      if (fetchError) {
        console.error("Failed to fetch expiring subscriptions:", fetchError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch subscriptions" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(`Found ${expiringSubscriptions?.length || 0} expiring subscriptions`);

      if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
        return new Response(
          JSON.stringify({ success: true, notified: 0 }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get plan names
      const planIds = [...new Set(expiringSubscriptions.map(s => s.plan_id))];
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('id, name')
        .in('id', planIds);
      const planMap = new Map(plans?.map(p => [p.id, p.name]) || []);

      // Get user emails
      const userIds = expiringSubscriptions.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      let notifiedCount = 0;
      
      for (const sub of expiringSubscriptions) {
        const profile = profileMap.get(sub.user_id);
        if (!profile) {
          console.warn(`No profile found for user ${sub.user_id}`);
          continue;
        }

        const userName = profile.full_name || profile.email.split('@')[0];
        const subPlanName = planMap.get(sub.plan_id) || 'Your Plan';
        const expiryDate = new Date(sub.expires_at!).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        });

        try {
          const emailResponse = await resend.emails.send({
            from: "TikTube <onboarding@resend.dev>",
            to: [profile.email],
            subject: "⚠️ Your subscription expires in 7 days",
            html: `
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
                    <h1>⚠️ Subscription Expiring Soon</h1>
                  </div>
                  <div class="content">
                    <p>Hi ${userName},</p>
                    
                    <div class="warning-box">
                      <strong>Your subscription will expire in 7 days!</strong>
                    </div>
                    
                    <p>Your TikTube subscription is about to expire. After expiration, you won't be able to add new accounts or run video scraping.</p>
                    
                    <div class="details">
                      <div class="detail-row">
                        <span class="label">Current Plan</span>
                        <span class="value">${subPlanName}</span>
                      </div>
                      <div class="detail-row">
                        <span class="label">Expires On</span>
                        <span class="value">${expiryDate}</span>
                      </div>
                    </div>
                    
                    <p>To continue using TikTube without interruption, please contact your administrator to renew your subscription.</p>
                    
                    <p>Thank you for using TikTube!</p>
                  </div>
                  <div class="footer">
                    <p>This is an automated message from TikTube.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          console.log(`Expiry warning sent to ${profile.email}:`, emailResponse);

          // Mark as notified
          await supabase
            .from('user_subscriptions')
            .update({ notification_sent_at: new Date().toISOString() })
            .eq('id', sub.id);

          notifiedCount++;
        } catch (emailError) {
          console.error(`Failed to send email to ${profile.email}:`, emailError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, notified: notifiedCount }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid notification type" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in subscription-notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
