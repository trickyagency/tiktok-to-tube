import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrandingSettings {
  platform_name: string;
  primary_color: string;
  logo_url: string | null;
}

const generateSchedulesPausedEmailHtml = (
  userName: string,
  pausedCount: number,
  branding: BrandingSettings,
  renewUrl: string
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
  <title>Your Schedules Have Been Paused - ${platformName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${platformName}" style="height: 50px; margin-bottom: 16px;">` : ''}
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${platformName}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">⚠️ Action Required</p>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 30px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 22px; font-weight: 600;">
                Hey ${userName || 'there'},
              </h2>
              <p style="color: #52525b; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                Your subscription has expired, and we've automatically paused <strong>${pausedCount} schedule${pausedCount > 1 ? 's' : ''}</strong> to prevent any issues with your uploads.
              </p>
              
              <!-- Warning box -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #dc2626; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                  ⏸️ Uploads Stopped
                </h3>
                <p style="color: #7f1d1d; margin: 0; font-size: 14px; line-height: 1.6;">
                  Your scheduled video uploads are no longer running. To resume automatic uploads, please renew your subscription.
                </p>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${renewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${primaryColor} 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">
                      Renew Subscription
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #a1a1aa; margin: 24px 0 0 0; font-size: 13px; line-height: 1.5; text-align: center;">
                Once you renew, you can reactivate your schedules from the dashboard.
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
                You received this because your subscription expired.
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting subscription expiry check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || 'https://repostflow.digitalautomators.com';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all active user subscriptions where expires_at has passed
    const now = new Date().toISOString();
    
    const { data: expiredSubscriptions, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, plan_id, expires_at')
      .eq('status', 'active')
      .lt('expires_at', now);

    if (fetchError) {
      console.error('Error fetching expired subscriptions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredSubscriptions?.length || 0} expired user subscriptions to update`);

    // Fetch branding settings for email
    let branding: BrandingSettings = {
      platform_name: 'RepostFlow',
      primary_color: '#8B5CF6',
      logo_url: null,
    };

    const { data: settingsData } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['platform_name', 'primary_color', 'logo_url']);

    if (settingsData) {
      settingsData.forEach((setting: { key: string; value: string | null }) => {
        if (setting.key === 'platform_name' && setting.value) {
          branding.platform_name = setting.value;
        } else if (setting.key === 'primary_color' && setting.value) {
          branding.primary_color = setting.value;
        } else if (setting.key === 'logo_url' && setting.value) {
          branding.logo_url = setting.value;
        }
      });
    }

    let emailsSent = 0;

    if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      // Update all expired subscriptions to 'expired' status
      const expiredIds = expiredSubscriptions.map(s => s.id);
      
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'expired',
          updated_at: now
        })
        .in('id', expiredIds);

      if (updateError) {
        console.error('Error updating subscriptions:', updateError);
        throw updateError;
      }

      console.log(`Successfully marked ${expiredIds.length} user subscriptions as expired`);

      // Log each expired subscription
      for (const sub of expiredSubscriptions) {
        console.log(`Expired: user subscription ${sub.id} for user ${sub.user_id}, was set to expire at ${sub.expires_at}`);
      }

      // Also update corresponding user_limits to reset account_count
      const userIds = expiredSubscriptions.map(s => s.user_id);
      const { error: limitsError } = await supabase
        .from('user_limits')
        .update({ 
          max_accounts: 0,
          updated_at: now
        })
        .in('user_id', userIds);

      if (limitsError) {
        console.error('Error updating user limits:', limitsError);
      } else {
        console.log(`Reset account limits for ${userIds.length} users`);
      }

      // Pause all active schedules for users with expired subscriptions and track per-user
      const { data: pausedSchedules, error: schedulesError } = await supabase
        .from('publish_schedules')
        .update({ 
          is_active: false,
          updated_at: now
        })
        .in('user_id', userIds)
        .eq('is_active', true)
        .select('id, user_id');

      if (schedulesError) {
        console.error('Error pausing schedules:', schedulesError);
      } else {
        console.log(`Paused ${pausedSchedules?.length || 0} active schedules for users with expired subscriptions`);

        // Send email notifications to users whose schedules were paused
        if (pausedSchedules && pausedSchedules.length > 0 && resendApiKey) {
          const resend = new Resend(resendApiKey);
          
          // Group paused schedules by user
          const pausedByUser = new Map<string, number>();
          pausedSchedules.forEach(schedule => {
            const count = pausedByUser.get(schedule.user_id) || 0;
            pausedByUser.set(schedule.user_id, count + 1);
          });

          // Send email to each affected user
          for (const [userId, pausedCount] of pausedByUser.entries()) {
            try {
              // Get user email and name from profiles
              const { data: profile } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('user_id', userId)
                .single();

              if (profile?.email) {
                const emailHtml = generateSchedulesPausedEmailHtml(
                  profile.full_name || '',
                  pausedCount,
                  branding,
                  `${siteUrl}/dashboard/upgrade`
                );

                const { error: emailError } = await resend.emails.send({
                  from: `${branding.platform_name} <notifications@repostflow.digitalautomators.com>`,
                  to: [profile.email],
                  subject: `⚠️ Your schedules have been paused - ${branding.platform_name}`,
                  html: emailHtml,
                });

                if (emailError) {
                  console.error(`Failed to send schedule paused email to ${profile.email}:`, emailError);
                } else {
                  console.log(`Sent schedule paused notification to ${profile.email} (${pausedCount} schedules)`);
                  emailsSent++;
                }
              }
            } catch (emailErr) {
              console.error(`Error sending email to user ${userId}:`, emailErr);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${expiredSubscriptions?.length || 0} expired user subscriptions`,
        expiredCount: expiredSubscriptions?.length || 0,
        emailsSent,
        timestamp: now
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Subscription expiry check failed:', errorMessage);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
