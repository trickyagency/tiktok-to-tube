import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all active subscriptions where expires_at has passed
    const now = new Date().toISOString();
    
    const { data: expiredSubscriptions, error: fetchError } = await supabase
      .from('account_subscriptions')
      .select('id, tiktok_account_id, expires_at')
      .eq('status', 'active')
      .lt('expires_at', now);

    if (fetchError) {
      console.error('Error fetching expired subscriptions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredSubscriptions?.length || 0} expired subscriptions to update`);

    if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      // Update all expired subscriptions to 'expired' status
      const expiredIds = expiredSubscriptions.map(s => s.id);
      
      const { error: updateError } = await supabase
        .from('account_subscriptions')
        .update({ 
          status: 'expired',
          updated_at: now
        })
        .in('id', expiredIds);

      if (updateError) {
        console.error('Error updating subscriptions:', updateError);
        throw updateError;
      }

      console.log(`Successfully marked ${expiredIds.length} subscriptions as expired`);

      // Log each expired subscription
      for (const sub of expiredSubscriptions) {
        console.log(`Expired: subscription ${sub.id} for account ${sub.tiktok_account_id}, was set to expire at ${sub.expires_at}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${expiredSubscriptions?.length || 0} expired subscriptions`,
        expiredCount: expiredSubscriptions?.length || 0,
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
