import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  valid: boolean;
  status: 'valid' | 'invalid' | 'expired' | 'not_configured' | 'error';
  message: string;
  details?: string;
}

async function validateApifyKey(apiKey: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim() === '') {
    return {
      valid: false,
      status: 'not_configured',
      message: 'API key not configured',
    };
  }

  try {
    // Test the API key by calling Apify's user info endpoint
    const response = await fetch('https://api.apify.com/v2/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const userData = await response.json();
      return {
        valid: true,
        status: 'valid',
        message: `API key is valid (User: ${userData.data?.username || 'Unknown'})`,
      };
    }

    // Handle specific error codes
    if (response.status === 401) {
      return {
        valid: false,
        status: 'invalid',
        message: 'Invalid API key',
        details: 'The API key is not recognized by Apify',
      };
    }

    if (response.status === 403) {
      return {
        valid: false,
        status: 'expired',
        message: 'API key expired or subscription inactive',
        details: 'Your Apify subscription may have expired or the API key has been revoked',
      };
    }

    // Try to get more details from response
    let errorDetails = '';
    try {
      const errorData = await response.json();
      errorDetails = errorData.error?.message || JSON.stringify(errorData);
    } catch {
      errorDetails = await response.text();
    }

    return {
      valid: false,
      status: 'error',
      message: `API validation failed (HTTP ${response.status})`,
      details: errorDetails,
    };
  } catch (error) {
    console.error('Error validating Apify key:', error);
    return {
      valid: false,
      status: 'error',
      message: 'Failed to validate API key',
      details: error instanceof Error ? error.message : 'Network error',
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is authenticated
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is owner
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single();

    const isOwner = !!roleData;

    // Parse request body - can optionally pass a key to test, otherwise uses saved key
    let apiKeyToTest: string | null = null;
    
    try {
      const body = await req.json();
      if (body.apiKey && isOwner) {
        // Only owners can test arbitrary keys
        apiKeyToTest = body.apiKey;
      }
    } catch {
      // No body or invalid JSON - will use saved key
    }

    // If no key provided, get from platform settings
    if (!apiKeyToTest) {
      const { data: settingData } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'apify_api_key')
        .single();
      
      apiKeyToTest = settingData?.value || null;
    }

    // Validate the key
    const result = await validateApifyKey(apiKeyToTest || '');

    console.log(`Apify key validation result: ${result.status} - ${result.message}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in apify-validate function:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        status: 'error', 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
