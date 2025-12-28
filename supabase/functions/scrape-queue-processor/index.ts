import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration for rate limiting
const MAX_CONCURRENT_SCRAPES = 3;
const DELAY_BETWEEN_SCRAPES_MS = 15000; // 15 seconds between starting each scrape
const BATCH_DELAY_MS = 5000; // 5 seconds between processing batches

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

// Start an Apify actor run and register webhook
async function startActorRunWithWebhook(
  apiKey: string,
  username: string
): Promise<{ runId: string } | null> {
  try {
    console.log(`Starting Apify actor for username: ${username}`);
    
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
      return null;
    }

    const data = await response.json();
    const runId = data?.data?.id as string | undefined;

    if (!runId) {
      console.error('Apify actor started but no runId returned:', JSON.stringify(data));
      return null;
    }

    console.log('Apify actor started:', runId);

    // Register an ad-hoc webhook scoped to this run
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
    return null;
  }
}

// Process a single queue item
async function processQueueItem(
  supabase: any,
  apiKey: string,
  queueItem: any
): Promise<{ success: boolean; error?: string }> {
  const { id: queueId, tiktok_account_id, user_id } = queueItem;

  try {
    // Mark as processing
    await supabase
      .from('scrape_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    // Get account info
    const { data: account, error: accountError } = await supabase
      .from('tiktok_accounts')
      .select('username')
      .eq('id', tiktok_account_id)
      .single();

    if (accountError || !account) {
      throw new Error(`Account not found: ${accountError?.message || 'unknown'}`);
    }

    // Update account status to scraping
    await supabase
      .from('tiktok_accounts')
      .update({
        scrape_status: 'scraping',
        scrape_progress_current: 0,
        scrape_progress_total: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tiktok_account_id);

    // Start Apify actor
    const runResult = await startActorRunWithWebhook(apiKey, account.username);
    
    if (!runResult) {
      throw new Error('Failed to start Apify actor');
    }

    // Store the run record
    const { error: runInsertError } = await supabase
      .from('apify_runs')
      .insert({
        run_id: runResult.runId,
        tiktok_account_id: tiktok_account_id,
        user_id: user_id,
        status: 'running',
      });

    if (runInsertError) {
      console.error('Failed to store run record:', runInsertError);
    }

    // Mark queue item as completed (scraping is now in progress via Apify)
    await supabase
      .from('scrape_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    console.log(`Queue item ${queueId} processed successfully, Apify run: ${runResult.runId}`);
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to process queue item ${queueId}:`, errorMessage);

    // Update queue item with error
    const attempts = (queueItem.attempts || 0) + 1;
    const maxAttempts = queueItem.max_attempts || 3;

    await supabase
      .from('scrape_queue')
      .update({
        status: attempts >= maxAttempts ? 'failed' : 'pending',
        attempts: attempts,
        error_message: errorMessage,
        // Schedule retry with exponential backoff
        scheduled_at: attempts < maxAttempts 
          ? new Date(Date.now() + Math.pow(2, attempts) * 60000).toISOString()
          : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    // Update account status to failed if max attempts reached
    if (attempts >= maxAttempts) {
      await supabase
        .from('tiktok_accounts')
        .update({
          scrape_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tiktok_account_id);
    }

    return { success: false, error: errorMessage };
  }
}

// Helper for delays
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = new Date();
  console.log(`Scrape queue processor started at: ${startTime.toISOString()}`);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get Apify API key
    const apiKey = await getApifyApiKey(supabase);
    if (!apiKey) {
      console.log('Apify API key not configured, skipping processing');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Apify API key not configured',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch pending queue items that are due
    const { data: queueItems, error: fetchError } = await supabase
      .from('scrape_queue')
      .select(`
        id,
        tiktok_account_id,
        user_id,
        attempts,
        max_attempts,
        scheduled_at
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(30); // Process max 30 items per run

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${queueItems?.length || 0} pending items to process`);

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending items',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process items in batches with rate limiting
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < queueItems.length; i += MAX_CONCURRENT_SCRAPES) {
      const batch = queueItems.slice(i, i + MAX_CONCURRENT_SCRAPES);
      
      console.log(`Processing batch ${Math.floor(i / MAX_CONCURRENT_SCRAPES) + 1} with ${batch.length} items`);

      // Process batch items sequentially with delay between each
      for (const item of batch) {
        const result = await processQueueItem(supabase, apiKey, item);
        processedCount++;
        
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }

        // Add delay between each scrape to avoid rate limits
        if (batch.indexOf(item) < batch.length - 1) {
          console.log(`Waiting ${DELAY_BETWEEN_SCRAPES_MS}ms before next scrape...`);
          await delay(DELAY_BETWEEN_SCRAPES_MS);
        }
      }

      // Add delay between batches
      if (i + MAX_CONCURRENT_SCRAPES < queueItems.length) {
        console.log(`Batch complete. Waiting ${BATCH_DELAY_MS}ms before next batch...`);
        await delay(BATCH_DELAY_MS);
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log(`Processing complete. Processed: ${processedCount}, Success: ${successCount}, Failed: ${failedCount}, Duration: ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        succeeded: successCount,
        failed: failedCount,
        durationMs: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scrape queue processor error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
