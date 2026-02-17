import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Webhook URL for Apify to call when the actor completes
const WEBHOOK_URL = 'https://qpufyeeqosvgipslwday.supabase.co/functions/v1/apify-webhook';

// Fetch the Apify API key from platform_settings
async function getApifyApiKey(supabase: any): Promise<string | null> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'apify_api_key')
    .single();
  
  if (error || !data?.value) {
    console.error('Failed to fetch Apify API key:', error);
    return null;
  }
  
  return data.value;
}

// Start an Apify actor run and register an ad-hoc webhook for completion
async function startActorRunWithWebhook(
  apiKey: string,
  username: string
): Promise<{ runId: string } | { error: string }> {
  try {
    const response = await fetch('https://api.apify.com/v2/acts/tKV6oSrYXiKNXXNy6/runs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Urls: [`https://www.tiktok.com/@${username}`],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to start Apify actor:', response.status, errorText);
      
      // Parse Apify error for a better user message
      try {
        const errorData = JSON.parse(errorText);
        const apifyType = errorData?.error?.type;
        if (apifyType === 'actor-memory-limit-exceeded') {
          return { error: 'Apify memory limit exceeded. Too many scraping jobs are running. Please wait for current jobs to finish and try again.' };
        }
        if (response.status === 402) {
          return { error: `Apify account limit reached: ${errorData?.error?.message || 'Please check your Apify subscription.'}` };
        }
      } catch (_) { /* ignore parse error */ }
      
      return { error: `Apify API error (${response.status}). Please check your API key and Actor subscription.` };
    }

    const data = await response.json();
    const runId = data?.data?.id as string | undefined;

    if (!runId) {
      console.error('Apify actor started but no runId returned:', JSON.stringify(data));
      return { error: 'Apify actor started but no run ID was returned.' };
    }

    console.log('Apify actor started:', runId);

    // Register an ad-hoc webhook scoped to THIS run.
    const webhookPayload = {
      isAdHoc: true,
      requestUrl: WEBHOOK_URL,
      eventTypes: [
        'ACTOR.RUN.SUCCEEDED',
        'ACTOR.RUN.FAILED',
        'ACTOR.RUN.ABORTED',
        'ACTOR.RUN.TIMED_OUT',
      ],
      condition: {
        actorRunId: runId,
      },
      shouldInterpolateStrings: true,
      payloadTemplate:
        '{"eventType":"{{eventType}}","eventData":{{eventData}},"resource":{{resource}}}',
    };

    const webhookResponse = await fetch('https://api.apify.com/v2/webhooks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const webhookText = await webhookResponse.text();
      console.error('Failed to register webhook:', webhookResponse.status, webhookText);
    } else {
      const webhookData = await webhookResponse.json().catch(() => null);
      console.log('Webhook registered for run:', runId, webhookData?.data?.id ?? '');
    }

    return { runId };
  } catch (error) {
    console.error('Error starting Apify actor:', error);
    return { error: 'Unexpected error starting Apify actor.' };
  }
}

// Helper to update account status
async function updateAccountStatus(
  supabase: any,
  accountId: string,
  status: 'pending' | 'scraping' | 'completed' | 'failed',
  extraData: Record<string, any> = {}
) {
  try {
    const { error } = await supabase
      .from('tiktok_accounts')
      .update({
        scrape_status: status,
        updated_at: new Date().toISOString(),
        ...extraData,
      })
      .eq('id', accountId);
    
    if (error) {
      console.error('Failed to update account status:', error);
    }
  } catch (e) {
    console.error('Error updating account status:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let accountId: string | null = null;

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Apify API key from platform_settings
    const apiKey = await getApifyApiKey(supabase);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Apify API key not configured. Please contact the platform owner.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { username, accountId: providedAccountId } = body;

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanUsername = username.replace(/^@/, '').trim();
    console.log(`Starting Apify scrape for username: ${cleanUsername}, user: ${user.id}`);

    // Check for existing account
    accountId = providedAccountId;
    
    if (!accountId) {
      const { data: existingAccount } = await supabase
        .from('tiktok_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('username', cleanUsername)
        .single();

      if (existingAccount) {
        accountId = existingAccount.id;
      }
    }

    // Create or update account with scraping status
    const accountData = {
      user_id: user.id,
      username: cleanUsername,
      scrape_status: 'scraping',
      scrape_progress_current: 0,
      scrape_progress_total: 0,
      updated_at: new Date().toISOString(),
    };

    let account;
    if (accountId) {
      const { data, error } = await supabase
        .from('tiktok_accounts')
        .update(accountData)
        .eq('id', accountId)
        .select()
        .single();
      
      if (error) throw error;
      account = data;
    } else {
      const { data, error } = await supabase
        .from('tiktok_accounts')
        .insert(accountData)
        .select()
        .single();
      
      if (error) throw error;
      account = data;
      accountId = account.id;
    }

    console.log(`Account saved: ${account.id}`);

    // Start Apify actor with webhook
    const runResult = await startActorRunWithWebhook(apiKey, cleanUsername);
    if ('error' in runResult) {
      await updateAccountStatus(supabase, account.id, 'failed');
      return new Response(
        JSON.stringify({ error: runResult.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Apify actor started with run ID: ${runResult.runId}`);

    // Store the run in our database so webhook can find it
    const { error: runInsertError } = await supabase
      .from('apify_runs')
      .insert({
        run_id: runResult.runId,
        tiktok_account_id: account.id,
        user_id: user.id,
        status: 'running',
      });

    if (runInsertError) {
      console.error('Failed to store run record:', runInsertError);
      // Don't fail the request - the webhook will still work via the run_id
    }

    // Return immediately - webhook will handle completion
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scraping started. Videos will appear when complete.',
        account: {
          id: account.id,
          username: cleanUsername,
        },
        runId: runResult.runId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Apify scraper error:', error);
    
    if (accountId) {
      await updateAccountStatus(supabase, accountId, 'failed');
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
