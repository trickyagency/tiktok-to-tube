import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/**
 * OAuth Callback Proxy
 * 
 * Google redirects to /functions/v1/youtube-oauth on our domain after user consent.
 * This component intercepts that request and forwards it to the actual Supabase Edge Function.
 */
const YouTubeOAuthProxy = () => {
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const searchParams = currentUrl.searchParams;
    
    // Ensure action=callback is present (Google returns code + state)
    if (!searchParams.has("action") && searchParams.has("code")) {
      searchParams.set("action", "callback");
    }
    
    // Build the real Supabase Edge Function URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/youtube-oauth?${searchParams.toString()}`;
    
    // Redirect to the actual edge function
    window.location.replace(edgeFunctionUrl);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Completing authorization...</p>
    </div>
  );
};

export default YouTubeOAuthProxy;
